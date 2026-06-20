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

#[derive(Deserialize, Serialize, Debug, Clone)]
struct SynodActionState {
    id: String,
    status: String, // "draft" | "submitting" | "committed" | "aborted"
    #[serde(rename = "payoutDetails")]
    payout_details: String,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
struct SynodStepTrace {
    #[serde(rename = "agentId")]
    agent_id: String,
    decision: String, // "approved" | "vetoed" | "failed"
    reason: String,
}

#[derive(Deserialize, Debug)]
struct ComposeRequest {
    #[serde(rename = "payoutId")]
    payout_id: String,
    amount: u64,
    recipient: String,
    salt: String,
    limit: u64,
    envelope: serde_json::Value, // EciesEnvelope
    proof: serde_json::Value,    // ZkProofData
    #[serde(rename = "forceHttpFailCode")]
    force_http_fail_code: Option<u16>,
    #[serde(rename = "forcePairingFail")]
    force_pairing_fail: Option<bool>,
}

#[cfg(target_arch = "wasm32")]
impl exports::synod::agent::contracts::Guest for Component {
    fn compose_action(
        req: exports::synod::agent::contracts::GenericInput,
    ) -> Result<Vec<u8>, String> {
        host::interfaces::logging::info("Coordinator: Starting compose_action...")?;

        let input_bytes = req.input.ok_or("compose_action: missing input payload")?;
        let compose_req: ComposeRequest = serde_json::from_slice(&input_bytes)
            .map_err(|e| format!("Failed to parse compose request: {}", e))?;

        let action_id = compose_req.payout_id.clone();
        let coord_key = format!("synod:coord:{}", action_id);

        // 1. Stage KV Action State -> status = "submitting"
        let action_state = SynodActionState {
            id: action_id.clone(),
            status: "submitting".to_string(),
            payout_details: format!("recipient: {}, amount: {}", compose_req.recipient, compose_req.amount),
        };
        let action_state_bytes = serde_json::to_vec(&action_state).unwrap();
        host::interfaces::kv_store::put("synod:coord", coord_key.as_bytes(), &action_state_bytes)?;
        host::interfaces::logging::info(&format!("Coordinator: Staged transaction {} as submitting", action_id))?;

        // 2. Step 1: Call Approver A (Treasury)
        host::interfaces::logging::info("Coordinator: Invoking Approver A (Treasury)...")?;
        let invoke_a_res = host::interfaces::contracts_call::invoke(&host::interfaces::contracts_call::InvokeRequest {
            target_contract: "approver-a".to_string(),
            function_name: "evaluate".to_string(),
            input: input_bytes.clone(), // Pass payload or empty
        });

        let mut step_index = 0;
        let mut step_trace_a = SynodStepTrace {
            agent_id: "approver-a".to_string(),
            decision: "approved".to_string(),
            reason: "Always approve (Treasury policy matches)".to_string(),
        };

        match invoke_a_res {
            Ok(output_bytes) => {
                // Parse decision
                if let Ok(val) = serde_json::from_slice::<serde_json::Value>(&output_bytes) {
                    if let Some(reason) = val.get("reason").and_then(|r| r.as_str()) {
                        step_trace_a.reason = reason.to_string();
                    }
                }
                let step_key = format!("synod:step:{}:{}", action_id, step_index);
                host::interfaces::kv_store::put("synod:step", step_key.as_bytes(), &serde_json::to_vec(&step_trace_a).unwrap())?;
            }
            Err(e) => {
                // Revert action state to aborted
                let mut aborted_state = action_state.clone();
                aborted_state.status = "aborted".to_string();
                host::interfaces::kv_store::put("synod:coord", coord_key.as_bytes(), &serde_json::to_vec(&aborted_state).unwrap())?;
                
                step_trace_a.decision = "failed".to_string();
                step_trace_a.reason = format!("Approver A contract invocation trapped or rejected: {:?}", e);
                let step_key = format!("synod:step:{}:{}", action_id, step_index);
                host::interfaces::kv_store::put("synod:step", step_key.as_bytes(), &serde_json::to_vec(&step_trace_a).unwrap())?;

                return Err(format!("Transaction Aborted: Approver A failed - {:?}", e));
            }
        }

        // 3. Step 2: Call Approver B (Compliance ZK Check)
        step_index += 1;
        host::interfaces::logging::info("Coordinator: Invoking Approver B (Compliance ZK verifier)...")?;
        
        let approver_b_input = serde_json::json!({
            "amount": compose_req.amount,
            "salt": compose_req.salt,
            "limit": compose_req.limit,
            "proof": compose_req.proof,
            "force_pairing_fail": compose_req.force_pairing_fail.unwrap_or(false),
        });
        let approver_b_input_bytes = serde_json::to_vec(&approver_b_input).unwrap();

        let invoke_b_res = host::interfaces::contracts_call::invoke(&host::interfaces::contracts_call::InvokeRequest {
            target_contract: "approver-b".to_string(),
            function_name: "evaluate".to_string(),
            input: approver_b_input_bytes,
        });

        let mut step_trace_b = SynodStepTrace {
            agent_id: "approver-b".to_string(),
            decision: "approved".to_string(),
            reason: "ZK compliance checks verified".to_string(),
        };

        match invoke_b_res {
            Ok(output_bytes) => {
                if let Ok(val) = serde_json::from_slice::<serde_json::Value>(&output_bytes) {
                    if let Some(reason) = val.get("reason").and_then(|r| r.as_str()) {
                        step_trace_b.reason = reason.to_string();
                    }
                }
                let step_key = format!("synod:step:{}:{}", action_id, step_index);
                host::interfaces::kv_store::put("synod:step", step_key.as_bytes(), &serde_json::to_vec(&step_trace_b).unwrap())?;
            }
            Err(e) => {
                // Rollback: Revert action state to aborted
                let mut aborted_state = action_state.clone();
                aborted_state.status = "aborted".to_string();
                host::interfaces::kv_store::put("synod:coord", coord_key.as_bytes(), &serde_json::to_vec(&aborted_state).unwrap())?;
                
                // Extract error message from inner-failed
                let err_msg = match e {
                    host::interfaces::contracts_call::InvokeError::InnerFailed(msg) => msg,
                    other => format!("{:?}", other),
                };

                step_trace_b.decision = "vetoed".to_string();
                step_trace_b.reason = err_msg.clone();
                let step_key = format!("synod:step:{}:{}", action_id, step_index);
                host::interfaces::kv_store::put("synod:step", step_key.as_bytes(), &serde_json::to_vec(&step_trace_b).unwrap())?;

                return Err(format!("Transaction Aborted: {}", err_msg));
            }
        }

        // 4. Step 3: Call Executor (Blind Decryption & Egress API Call)
        step_index += 1;
        host::interfaces::logging::info("Coordinator: Invoking Executor (Blind decrypt & http egress)...")?;

        let executor_input = serde_json::json!({
            "envelope": compose_req.envelope,
            "force_http_fail_code": compose_req.force_http_fail_code,
        });
        let executor_input_bytes = serde_json::to_vec(&executor_input).unwrap();

        let invoke_exec_res = host::interfaces::contracts_call::invoke(&host::interfaces::contracts_call::InvokeRequest {
            target_contract: "executor".to_string(),
            function_name: "execute".to_string(),
            input: executor_input_bytes,
        });

        let mut step_trace_exec = SynodStepTrace {
            agent_id: "executor".to_string(),
            decision: "approved".to_string(),
            reason: "Blind payout webhook settled, VC issued".to_string(),
        };

        match invoke_exec_res {
            Ok(receipt_vc_bytes) => {
                let step_key = format!("synod:step:{}:{}", action_id, step_index);
                host::interfaces::kv_store::put("synod:step", step_key.as_bytes(), &serde_json::to_vec(&step_trace_exec).unwrap())?;

                // 5. Commit Action State -> status = "committed"
                let mut committed_state = action_state.clone();
                committed_state.status = "committed".to_string();
                host::interfaces::kv_store::put("synod:coord", coord_key.as_bytes(), &serde_json::to_vec(&committed_state).unwrap())?;

                host::interfaces::logging::info(&format!("Coordinator: Committed transaction {}", action_id))?;
                Ok(receipt_vc_bytes)
            }
            Err(e) => {
                // Rollback: Revert action state to aborted
                let mut aborted_state = action_state.clone();
                aborted_state.status = "aborted".to_string();
                host::interfaces::kv_store::put("synod:coord", coord_key.as_bytes(), &serde_json::to_vec(&aborted_state).unwrap())?;

                let err_msg = match e {
                    host::interfaces::contracts_call::InvokeError::InnerFailed(msg) => msg,
                    other => format!("{:?}", other),
                };

                step_trace_exec.decision = "failed".to_string();
                step_trace_exec.reason = err_msg.clone();
                let step_key = format!("synod:step:{}:{}", action_id, step_index);
                host::interfaces::kv_store::put("synod:step", step_key.as_bytes(), &serde_json::to_vec(&step_trace_exec).unwrap())?;

                return Err(format!("Transaction Aborted: {}", err_msg));
            }
        }
    }

    fn get_trace(
        req: exports::synod::agent::contracts::GenericInput,
    ) -> Result<Vec<u8>, String> {
        let input_bytes = req.input.ok_or("get_trace: missing input payload")?;
        let action_id: String = serde_json::from_slice(&input_bytes)
            .map_err(|e| format!("Failed to parse action ID: {}", e))?;

        host::interfaces::logging::info(&format!("Coordinator: Fetching execution trace for {}", action_id))?;

        // Read coordinator action state
        let coord_key = format!("synod:coord:{}", action_id);
        let coord_bytes_opt = host::interfaces::kv_store::get("synod:coord", coord_key.as_bytes())?;
        
        let action_state: SynodActionState = match coord_bytes_opt {
            Some(bytes) => serde_json::from_slice(&bytes).map_err(|e| e.to_string())?,
            None => {
                return Err(format!("No transaction history found for actionId: {}", action_id));
            }
        };

        // Scan/retrieve steps
        let mut steps = Vec::new();
        for step_idx in 0..3 {
            let step_key = format!("synod:step:{}:{}", action_id, step_idx);
            if let Some(bytes) = host::interfaces::kv_store::get("synod:step", step_key.as_bytes())? {
                if let Ok(step) = serde_json::from_slice::<SynodStepTrace>(&bytes) {
                    steps.push(step);
                }
            }
        }

        let trace_response = serde_json::json!({
            "actionId": action_id,
            "status": action_state.status,
            "payoutDetails": action_state.payout_details,
            "steps": steps
        });

        serde_json::to_vec(&trace_response).map_err(|e| e.to_string())
    }

    fn evaluate(
        _req: exports::synod::agent::contracts::GenericInput,
    ) -> Result<Vec<u8>, String> {
        Err("Not implemented in coordinator".to_string())
    }

    fn execute(
        _req: exports::synod::agent::contracts::GenericInput,
    ) -> Result<Vec<u8>, String> {
        Err("Not implemented in coordinator".to_string())
    }
}

#[cfg(target_arch = "wasm32")]
export!(Component);
