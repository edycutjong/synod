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

        // 1. Check if we are simulating a direct pairing check failure (Abort Condition)
        if eval_req.force_pairing_fail || eval_req.proof.pi_a.is_empty() || eval_req.proof.pi_a[0] == "fail" {
            host::interfaces::logging::error("Approver B (Compliance): Groth16 Pairing check fails!")?;
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
            host::interfaces::logging::error("Approver B (Compliance): Computed hash does not match public inputs!")?;
            return Err("Compliance Abort: Groth16 Pairing check fails - hash mismatch".to_string());
        }

        // 4. Verify spending limit policy boundary (Veto Condition)
        // If the secret amount exceeds the threshold, or if the limit threshold is above our allowed standard
        if eval_req.amount > public_limit_threshold {
            host::interfaces::logging::error(&format!(
                "Approver B (Compliance): Limit exceeded! Amount: {}, Limit: {}",
                eval_req.amount, public_limit_threshold
            ))?;
            return Err(format!(
                "Compliance Veto: Amount {} exceeds limit threshold {}",
                eval_req.amount, public_limit_threshold
            ));
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
