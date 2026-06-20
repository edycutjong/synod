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

struct Component;

#[cfg(target_arch = "wasm32")]
impl exports::synod::agent::contracts::Guest for Component {
    fn compose_action(
        _req: exports::synod::agent::contracts::GenericInput,
    ) -> Result<Vec<u8>, String> {
        Err("Not implemented in approver-a".to_string())
    }

    fn get_trace(
        _req: exports::synod::agent::contracts::GenericInput,
    ) -> Result<Vec<u8>, String> {
        Err("Not implemented in approver-a".to_string())
    }

    fn evaluate(
        _req: exports::synod::agent::contracts::GenericInput,
    ) -> Result<Vec<u8>, String> {
        host::interfaces::logging::info("Approver A (Treasury): Evaluating payout request...")?;
        host::interfaces::logging::info("Approver A (Treasury): Approved")?;
        
        let response = serde_json::json!({
            "status": "approved",
            "reason": "Always approve (Treasury policy matches)"
        });
        
        serde_json::to_vec(&response).map_err(|e| e.to_string())
    }

    fn execute(
        _req: exports::synod::agent::contracts::GenericInput,
    ) -> Result<Vec<u8>, String> {
        Err("Not implemented in approver-a".to_string())
    }
}

#[cfg(target_arch = "wasm32")]
export!(Component);
