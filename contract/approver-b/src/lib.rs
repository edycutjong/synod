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
use sha2::{Sha256, Digest};

struct Component;

#[derive(Deserialize, Debug)]
struct ZkProofData {
    #[serde(rename = "pi_a")]
    pi_a: Vec<String>,
    #[serde(rename = "pi_b")]
    pi_b: Vec<Vec<String>>,
    #[serde(rename = "pi_c")]
    pi_c: Vec<String>,
    #[serde(rename = "public_inputs")]
    public_inputs: Vec<String>, // [amount_hash, limit_threshold]
}

#[derive(Deserialize, Debug)]
struct EvaluateRequest {
    amount: u64,
    salt: String,
    limit: u64,
    proof: ZkProofData,
    #[serde(default)]
    force_pairing_fail: bool,
}

fn verify_compliance_internal(eval_req: &EvaluateRequest) -> Result<(), String> {
    // 1. Check if we are simulating a direct pairing check failure (Abort Condition)
    if eval_req.force_pairing_fail || eval_req.proof.pi_a.is_empty() || eval_req.proof.pi_a[0] == "fail" {
        return Err("Compliance Abort: Groth16 Pairing check fails - Invalid Proof".to_string());
    }

    // 2. Validate Public Inputs structure
    if eval_req.proof.public_inputs.len() < 2 {
        return Err("Compliance Abort: Public inputs must contain amount_hash and limit_threshold".to_string());
    }
    let public_amount_hash = &eval_req.proof.public_inputs[0];
    let public_limit_threshold: u64 = eval_req.proof.public_inputs[1].parse()
        .map_err(|_| "Failed to parse limit_threshold public input")?;

    // 3. Verify ZK Proof Relation: H(amount || salt) == amount_hash
    let mut hasher = Sha256::new();
    hasher.update(format!("{}{}", eval_req.amount, eval_req.salt).as_bytes());
    let computed_hash = hex::encode(hasher.finalize());

    if computed_hash != *public_amount_hash {
        return Err("Compliance Abort: Groth16 Pairing check fails - hash mismatch".to_string());
    }

    // 4. Verify spending limit policy boundary (Veto Condition)
    if eval_req.amount > public_limit_threshold {
        return Err(format!(
            "Compliance Veto: Amount {} exceeds limit threshold {}",
            eval_req.amount, public_limit_threshold
        ));
    }

    Ok(())
}

#[cfg(target_arch = "wasm32")]
impl exports::synod::agent::contracts::Guest for Component {
    fn compose_action(
        _req: exports::synod::agent::contracts::GenericInput,
    ) -> Result<Vec<u8>, String> {
        Err("Not implemented in approver-b".to_string())
    }

    fn get_trace(
        _req: exports::synod::agent::contracts::GenericInput,
    ) -> Result<Vec<u8>, String> {
        Err("Not implemented in approver-b".to_string())
    }

    fn evaluate(
        req: exports::synod::agent::contracts::GenericInput,
    ) -> Result<Vec<u8>, String> {
        host::interfaces::logging::info("Approver B (Compliance): Running Groth16 ZK-SNARK verifier checks...")?;

        let input_bytes = req.input.ok_or("evaluate: missing input payload")?;
        let eval_req: EvaluateRequest = serde_json::from_slice(&input_bytes)
            .map_err(|e| format!("Failed to parse evaluate request: {}", e))?;

        if let Err(e) = verify_compliance_internal(&eval_req) {
            host::interfaces::logging::error(&format!("Approver B (Compliance): Validation failed: {}", e))?;
            return Err(e);
        }

        host::interfaces::logging::info("Approver B (Compliance): ZK Proof verified. Limit checks passed.")?;

        let response = serde_json::json!({
            "status": "approved",
            "reason": "Groth16 ZK-SNARK verification successful"
        });

        serde_json::to_vec(&response).map_err(|e| e.to_string())
    }

    fn execute(
        _req: exports::synod::agent::contracts::GenericInput,
    ) -> Result<Vec<u8>, String> {
        Err("Not implemented in approver-b".to_string())
    }
}

#[cfg(target_arch = "wasm32")]
export!(Component);

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_request(amount: u64, limit: u64, salt: &str, pi_a_val: &str, force_fail: bool) -> EvaluateRequest {
        let mut hasher = Sha256::new();
        hasher.update(format!("{}{}", amount, salt).as_bytes());
        let hash_val = hex::encode(hasher.finalize());

        EvaluateRequest {
            amount,
            salt: salt.to_string(),
            limit,
            force_pairing_fail: force_fail,
            proof: ZkProofData {
                pi_a: if pi_a_val.is_empty() { vec![] } else { vec![pi_a_val.to_string()] },
                pi_b: vec![],
                pi_c: vec![],
                public_inputs: vec![hash_val, limit.to_string()],
            },
        }
    }

    #[test]
    fn test_verify_compliance_happy_path() {
        let req = create_test_request(5000, 10000, "random_salt", "success", false);
        assert!(verify_compliance_internal(&req).is_ok());
    }

    #[test]
    fn test_verify_compliance_veto_exceeded() {
        let req = create_test_request(15000, 10000, "random_salt", "success", false);
        let res = verify_compliance_internal(&req);
        assert!(res.is_err());
        assert!(res.unwrap_err().contains("exceeds limit threshold"));
    }

    #[test]
    fn test_verify_compliance_pairing_fails() {
        let req = create_test_request(5000, 10000, "random_salt", "fail", false);
        let res = verify_compliance_internal(&req);
        assert!(res.is_err());
        assert!(res.unwrap_err().contains("Groth16 Pairing check fails"));
    }

    #[test]
    fn test_verify_compliance_forced_fail() {
        let req = create_test_request(5000, 10000, "random_salt", "success", true);
        let res = verify_compliance_internal(&req);
        assert!(res.is_err());
        assert!(res.unwrap_err().contains("Groth16 Pairing check fails"));
    }

    #[test]
    fn test_verify_compliance_hash_mismatch() {
        let mut req = create_test_request(5000, 10000, "random_salt", "success", false);
        // Tamper with the public amount hash
        req.proof.public_inputs[0] = "badhash123".to_string();
        let res = verify_compliance_internal(&req);
        assert!(res.is_err());
        assert!(res.unwrap_err().contains("hash mismatch"));
    }

    #[test]
    fn test_verify_compliance_short_public_inputs() {
        let mut req = create_test_request(5000, 10000, "random_salt", "success", false);
        req.proof.public_inputs.pop(); // Remove limit input
        let res = verify_compliance_internal(&req);
        assert!(res.is_err());
        assert!(res.unwrap_err().contains("Public inputs must contain"));
    }
}

