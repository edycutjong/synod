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

#[cfg(any(target_arch = "wasm32", test))]
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

#[cfg(test)]
mod tests {
    use super::*;
    use exports::synod::agent::contracts::Guest;

    #[test]
    fn test_sanity() {
        assert_eq!(2 + 2, 4);
    }

    #[test]
    fn test_evaluate() {
        let req = exports::synod::agent::contracts::GenericInput {
            input: None,
            user_profile: None,
            context: None,
        };
        let res = Component::evaluate(req);
        assert!(res.is_ok());
    }
}


