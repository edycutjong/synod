# Security Audit & Threat Modeling Report: Synod

This document outlines the core security invariants, threat vectors, and mitigation strategies of the Synod atomic multi-agent orchestration engine.

> **Design intent vs. local demo.** Synod is a DoraHacks T3 ADK demo running against a **simulated** Terminal 3 host (see the "Hackathon Simulation Context" on the dashboard). The invariants below describe the intended production design; each one is annotated with a **Demo status** noting what the local sandbox actually enforces today versus what is mocked. We keep the distinction explicit so the report is not mistaken for a claim of hardware-backed guarantees.

---

## 1. System Invariants

Synod relies on three primary security and cryptographic invariants to guarantee the integrity of multi-agent transactions inside hardware-secured enclaves.

### Invariant 1: Multi-Agent Transaction Atomicity (All-or-Nothing)
* **Definition:** If any specialist agent vetoes, throws an execution exception, or experiences a network outage, all staged state changes in the TEE KV store must be rolled back, and no external egress actions (webhooks/payouts) must be committed.
* **Verification:** Enforced via the T3 `contracts-call` boundary and staged KV journals. The coordinator stages the status as `submitting` and only transitions to `committed` when all child enclaves approve. A failure at any intermediate step changes the coordinator's status to `aborted`, guaranteeing zero side effects.
* **Demo status — *enforced***. The sequential `contracts-call` chain and the abort-on-any-failure rollback are implemented in `contract/coordinator/src/lib.rs` and exercised end-to-end. A `payoutId` replay/idempotency guard (below) is also enforced before staging.

### Invariant 2: Cryptographic Privacy (Envelope Isolation)
* **Definition:** No intermediate specialist (Treasury or Compliance) or the coordinator itself should be able to view the plaintext details of the payout (e.g., recipient address, account info, external target URL) before execution.
* **Verification:** Enforced via ECIES payload encryption. The recipient-account payload is encrypted client-side using secp256k1 ECIES targeting the public key of the **Executor enclave**. Only the Executor possesses the private key (`d_X`) to decrypt the envelope at the edge of execution.
* **Demo status — *partially enforced*.** The ECIES envelope is **real** (k256 ECDH + HKDF-SHA256 + AES-256-GCM; only the executor decrypts the recipient account — see `contract/executor/src/lib.rs`). However, the executor's private key is a **non-secret demo key checked into the repo**, and the Coordinator currently receives the cleartext `amount`/`recipient` in the `ComposeRequest` and stages them as plaintext `payoutDetails` in KV. So envelope isolation from the *executor's* egress is demonstrated, but isolation from the *coordinator* is not. In production the key lives only in TDX-sealed memory and the coordinator would route the opaque envelope without the cleartext fields.

### Invariant 3: Compliance Integrity (ZK-SNARK Boundaries)
* **Definition:** The Compliance agent must verify that the transaction amount does not exceed the limit threshold without the client exposing the plaintext amount during the validation phase, preventing front-running or internal telemetry leakage.
* **Verification:** Designed around a Groth16 verifier checking `Amount <= Limit` against public inputs `H(amount || salt)` and the `Limit` threshold.
* **Demo status — *simulated*.** The Groth16 proof is a **mock**: `pi_a/pi_b/pi_c` are fixed constants and are not pairing-checked. Approver-B (`contract/approver-b/src/lib.rs`) verifies the `H(amount || salt)` commitment and then compares `amount <= limit` against the **cleartext** amount it is handed by the coordinator — so the confidentiality property is not actually achieved in the local demo. The hash-commitment and limit check are real; the zero-knowledge property is not.

---

## 2. Threat Vector Modeling & Defenses

| Threat Vector | Description | Defense Strategy | Status |
|---|---|---|---|
| **Compromised Coordinator** | An attacker gains control of the coordinator agent to bypass compliance rules. | The Coordinator does not perform validation; it only routes calls. Leaf specialists (e.g. Approver B) independently verify the compliance check and output their own evaluations. | **Partial** — routing/independent-eval split is real, but the coordinator currently sees the cleartext `amount`/`recipient` (Invariant 2) and the leaf "ZK" check is mocked (Invariant 3). |
| **Telemetry Egress Leakage** | Host OS or memory dump attacks attempt to read sensitive payout parameters. | In production, Intel TDX memory encryption blocks Host OS reads; sensitive transit payloads are wrapped in ECIES envelopes. | **Simulated** — the ECIES envelope is real, but TDX hardware isolation is not present in the local sandbox; logs avoid printing the decrypted account. |
| **Transaction Replay Attack** | An attacker replays a valid envelope/proof to release a duplicate payout. | Before staging, the coordinator reads `synod:coord:<payoutId>` and rejects the request if that id is already `submitting` or `committed` (a previously `aborted` id may be retried). Implemented in `contract/coordinator/src/lib.rs`. | **Protected** — enforced in-contract and covered by a transpiled-WASM functional test. |
| **Malicious Specialist / Stake Slasher** | A specialist attempts to falsely claim approval or double-vote. | All specialist decisions are recorded in the trace ledger `synod:step:<actionId>:<stepIndex>`. The final receipt is issued as a Verifiable Credential signed with the enclave authority key. | **Partial** — the trace ledger and real secp256k1-signed VC receipt exist; staking/slashing is seeded demo data, not enforced logic. |
