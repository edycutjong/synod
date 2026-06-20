extern crate alloc;

wit_bindgen::generate!({
    world: "synod",
    path: "../wit",
    additional_derives: [
        serde::Deserialize,
        serde::Serialize,
    ],
    generate_all,
});

use alloc::string::String;
use alloc::vec::Vec;
use alloc::format;
use serde::{Deserialize, Serialize};

struct Component;

// Fixed private key matching our SDK generated public key
const ENCLAVE_PRIVATE_KEY: &str = "b29d2f6ee9011fab5046eb7190f47c216e52438fa0fba67516e7c1e376673e9a";

#[derive(Deserialize, Serialize, Debug)]
pub struct EciesEnvelope {
    #[serde(alias = "ephemeralPublicKey", alias = "ephemeral_pubkey")]
    pub ephemeral_public_key: String,
    pub iv: String,
    pub ciphertext: String,
    #[serde(alias = "authTag", alias = "mac")]
    pub auth_tag: String,
}

#[derive(Deserialize, Debug)]
struct ExecuteRequest {
    envelope: EciesEnvelope,
    #[serde(default)]
    force_http_fail_code: Option<u16>,
}

#[derive(Deserialize, Serialize, Debug)]
struct PayoutPayload {
    #[serde(rename = "recipient_account", alias = "recipient")]
    recipient_account: String,
    amount: u64,
}

// Decryption logic using k256, aes-gcm, hkdf, sha2
fn decrypt_ecies_payload(envelope: &EciesEnvelope) -> Result<String, String> {
    // 1. Decode hex inputs
    let ephemeral_pk_bytes = hex::decode(&envelope.ephemeral_public_key)
        .map_err(|e| format!("Failed to decode ephemeral public key: {e}"))?;
    let iv_bytes = hex::decode(&envelope.iv)
        .map_err(|e| format!("Failed to decode iv: {e}"))?;
    let mut ciphertext_bytes = hex::decode(&envelope.ciphertext)
        .map_err(|e| format!("Failed to decode ciphertext: {e}"))?;
    let auth_tag_bytes = hex::decode(&envelope.auth_tag)
        .map_err(|e| format!("Failed to decode auth tag: {e}"))?;

    let mut enclave_sk_bytes = hex::decode(ENCLAVE_PRIVATE_KEY)
        .map_err(|e| format!("Failed to decode private key: {e}"))?;

    // 2. Perform ECDH Diffie-Hellman
    let pk = k256::PublicKey::from_sec1_bytes(&ephemeral_pk_bytes)
        .map_err(|e| format!("Invalid ephemeral public key format: {e}"))?;
    let sk = k256::SecretKey::from_slice(&enclave_sk_bytes)
        .map_err(|e| format!("Invalid enclave private key: {e}"))?;

    let shared_secret = k256::ecdh::diffie_hellman(sk.to_nonzero_scalar(), pk.as_affine());
    let shared_secret_bytes = shared_secret.raw_secret_bytes();

    // 3. HKDF key expansion
    let hk = hkdf::Hkdf::<sha2::Sha256>::new(None, shared_secret_bytes.as_slice());
    let mut okm = [0u8; 44];
    hk.expand(&[], &mut okm).map_err(|_| "HKDF expansion failed")?;
    let key_bytes = &okm[0..32];
    let derived_iv = &okm[32..44];

    // Use envelope's IV if provided, otherwise derived
    let final_iv = if iv_bytes.is_empty() { derived_iv } else { &iv_bytes[..] };

    // 4. Decrypt via AES-GCM
    use aes_gcm::{Aes256Gcm, KeyInit, aead::Aead};
    let cipher = Aes256Gcm::new_from_slice(key_bytes)
        .map_err(|e| format!("Failed to initialize AES-GCM cipher: {e}"))?;
    
    // Combine ciphertext and authentication tag
    let mut encrypted_payload = ciphertext_bytes.clone();
    encrypted_payload.extend_from_slice(&auth_tag_bytes);

    let mut plaintext_bytes = cipher.decrypt(final_iv.into(), encrypted_payload.as_slice())
        .map_err(|e| format!("Decryption failed: {e}"))?;

    let decrypted_str = String::from_utf8(plaintext_bytes.clone())
        .map_err(|e| format!("Plaintext is not valid UTF-8: {e}"))?;

    // 5. Securely scrub sensitive keys and plaintext bytes from volatile TEE memory
    unsafe {
        // Zero out private key bytes
        for b in enclave_sk_bytes.iter_mut() {
            std::ptr::write_volatile(b, 0u8);
        }
        // Zero out HKDF derived keys and IVs
        for b in okm.iter_mut() {
            std::ptr::write_volatile(b, 0u8);
        }
        // Zero out raw ciphertext copies
        for b in ciphertext_bytes.iter_mut() {
            std::ptr::write_volatile(b, 0u8);
        }
        // Zero out decrypted plaintext bytes
        for b in plaintext_bytes.iter_mut() {
            std::ptr::write_volatile(b, 0u8);
        }
    }

    Ok(decrypted_str)
}

#[cfg(target_arch = "wasm32")]
impl exports::synod::agent::contracts::Guest for Component {
    fn compose_action(
        _req: exports::synod::agent::contracts::GenericInput,
    ) -> Result<Vec<u8>, String> {
        Err("Not implemented in executor".to_string())
    }

    fn get_trace(
        _req: exports::synod::agent::contracts::GenericInput,
    ) -> Result<Vec<u8>, String> {
        Err("Not implemented in executor".to_string())
    }

    fn evaluate(
        _req: exports::synod::agent::contracts::GenericInput,
    ) -> Result<Vec<u8>, String> {
        Err("Not implemented in executor".to_string())
    }

    fn execute(
        req: exports::synod::agent::contracts::GenericInput,
    ) -> Result<Vec<u8>, String> {
        host::interfaces::logging::info("Executor: Initiating secure blind execution...")?;

        let input_bytes = req.input.ok_or("execute: missing input payload")?;
        let exec_req: ExecuteRequest = serde_json::from_slice(&input_bytes)
            .map_err(|e| format!("Failed to parse execute request: {}", e))?;

        // 1. Decrypt ECIES payload
        host::interfaces::logging::info("Executor: Decrypting ECIES payload...")?;
        let decrypted_payload = decrypt_ecies_payload(&exec_req.envelope)?;
        host::interfaces::logging::info("Executor: Decrypted ECIES payload successfully")?;

        let payout: PayoutPayload = serde_json::from_str(&decrypted_payload)
            .map_err(|e| format!("Failed to parse payout details: {}", e))?;

        // 2. HTTP Egress with placeholders / Resolved Body
        let url = "https://treasury.sandbox.test/payout".to_string();
        host::interfaces::logging::info(&format!("Executor: Firing blind egress POST to: {}", url))?;

        // Handle forced failures for rollback testing (e.g. 503 Service Unavailable)
        if let Some(fail_code) = exec_req.force_http_fail_code {
            host::interfaces::logging::error(&format!("Executor: Simulated HTTP outage! Code: {}", fail_code))?;
            return Err(format!("HTTP {} Service Unavailable", fail_code));
        }

        let body_bytes = serde_json::to_vec(&payout).map_err(|e| e.to_string())?;

        let http_response = host::interfaces::http_with_placeholders::call(&host::interfaces::http_with_placeholders::Request {
            method: host::interfaces::http_with_placeholders::Verb::Post,
            url: url.clone(),
            headers: Some(alloc::vec![("Content-Type".to_string(), "application/json".to_string())]),
            payload: Some(body_bytes),
        }).map_err(|e| format!("HTTP egress webhook failed: {:?}", e))?;

        if http_response.code != 200 && http_response.code != 201 {
            host::interfaces::logging::error(&format!("Executor: Target API returned status {}", http_response.code))?;
            return Err(format!("HTTP {} Service Unavailable", http_response.code));
        }

        host::interfaces::logging::info("Executor: Payout settled on-chain/target API successfully.")?;

        // 3. Issue signed Verifiable Credential Receipt
        let timestamp = host::interfaces::clock::now_ms().unwrap_or(0);
        let tenant_did_bytes = host::tenant::tenant_context::tenant_did();
        let tenant_did = String::from_utf8_lossy(&tenant_did_bytes).to_string();

        let receipt_id = format!("receipt_executor_{}", timestamp);

        #[derive(Serialize)]
        struct ClaimSubject {
            recipient_account: String,
            amount: u64,
            status: String,
            timestamp: u64,
        }

        #[derive(Serialize)]
        struct VCReceipt {
            id: String,
            issuer: String,
            #[serde(rename = "credentialSubject")]
            credential_subject: ClaimSubject,
        }

        let vc = VCReceipt {
            id: receipt_id,
            issuer: format!("did:t3n:{}", tenant_did),
            credential_subject: ClaimSubject {
                recipient_account: payout.recipient_account.clone(),
                amount: payout.amount,
                status: "settled".to_string(),
                timestamp,
            },
        };

        let vc_bytes = serde_json::to_vec(&vc).map_err(|e| e.to_string())?;
        
        let signature_blob = host::interfaces::signing::sign(&vc_bytes)
            .map_err(|e| format!("Signing error: {:?}", e))?;

        #[derive(Serialize)]
        struct SignedProof {
            #[serde(flatten)]
            vc: VCReceipt,
            proof: serde_json::Value,
        }

        let signature_value = hex::encode(signature_blob);

        let signed_vc = SignedProof {
            vc,
            proof: serde_json::json!({
                "type": "JsonWebSignature2020",
                "created": timestamp,
                "verificationMethod": format!("did:t3n:{}#key-1", tenant_did),
                "proofPurpose": "assertionMethod",
                "signatureValue": signature_value
            }),
        };

        let signed_vc_bytes = serde_json::to_vec(&signed_vc).map_err(|e| e.to_string())?;

        Ok(signed_vc_bytes)
    }
}

#[cfg(target_arch = "wasm32")]
export!(Component);
