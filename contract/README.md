# Synod Enclave Contracts Workspace

Rust Cargo workspace compilation of TEE enclave contracts executing under the Terminal 3 Agent Dev Kit runtime (`wasm32-wasip2`).

## Workspace Components

| Package | Role | Key APIs |
|---|---|---|
| `coordinator` | Coordinates sequence execution, Stages KV state, rolls back on any leaf failures. | `compose-action` |
| `approver-a` | Treasury specialist: verifies corporate payout budgets. | `evaluate` |
| `approver-b` | Compliance specialist: verifies Groth16 limit proofs. | `evaluate-zk` |
| `executor` | Blind paymaster: decrypts ECIES and runs blind outbox egress. | `execute-blind` |

## Transaction Rollback Semantics

All leaf enclaves are invoked synchronously by the `coordinator` via `contracts-call` within a single execution frame. If any specialist returns an error or a veto decision:

1. The coordinator intercepts the exception.
2. The coordinator reverts all staged database variables in the enclave's KV store.
3. The transaction aborts with zero side effects.

## Compilation & Tests

```bash
# Compile all contracts to target wasm32-wasip2
cargo build --target wasm32-wasip2 --release

# Run Rust unit tests for all workspace projects
cargo test
```
