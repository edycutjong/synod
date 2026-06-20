# Security Audit & Threat Modeling Report: Synod

This document outlines the core security invariants, threat vectors, and mitigation strategies implemented in the Synod atomic multi-agent orchestration engine.

---

## 1. System Invariants

Synod relies on three primary security and cryptographic invariants to guarantee the integrity of multi-agent transactions inside hardware-secured enclaves.

### Invariant 1: Multi-Agent Transaction Atomicity (All-or-Nothing)
* **Definition:** If any specialist agent vetoes, throws an execution exception, or experiences a network outage, all staged state changes in the TEE KV store must be rolled back, and no external egress actions (webhooks/payouts) must be committed.
* **Verification:** Enforced via the T3 `contracts-call` boundary and staged KV journals. The coordinator stages the status as `submitting` and only transitions to `committed` when all child enclaves approve. A failure at any intermediate step changes the coordinator's status to `aborted`, guaranteeing zero side effects.

### Invariant 2: Cryptographic Privacy (Envelope Isolation)
* **Definition:** No intermediate specialist (Treasury or Compliance) or the coordinator itself should be able to view the plaintext details of the payout (e.g., recipient address, account info, external target URL) before execution.
* **Verification:** Enforced via ECIES payload encryption. The payload is encrypted client-side using secp256k1 ECIES targeting the public key of the **Executor enclave**. Only the Executor possesses the private key (`d_X`) inside its secure memory to decrypt the envelope at the absolute edge of execution.

### Invariant 3: compliance Integrity (ZK-SNARK Boundaries)
* **Definition:** The Compliance agent must verify that the transaction amount does not exceed the limit threshold without the client exposing the plaintext amount during the validation phase, preventing front-running or internal telemetry leakage.
* **Verification:** Enforced via Groth16 Zero-Knowledge SNARK verifier check. The verifier checks the proof of amount limit satisfaction `Amount <= Limit` using public inputs `H(amount || salt)` and the `Limit` threshold, ensuring complete confidentiality.

---

## 2. Threat Vector Modeling & Defenses

| Threat Vector | Description | Defense Strategy | Status |
|---|---|---|---|
| **Compromised Coordinator** | An attacker gains control of the coordinator agent to bypass compliance rules. | The Coordinator does not perform validation; it only routes calls. The leaf specialist agents (e.g. Approver B) independently verify the ZK compliance proofs and output signed evaluations. | **Protected** |
| **Telemetry Egress Leakage** | Host OS or memory dump attacks attempt to read sensitive payout parameters. | The TEE (Intel TDX) memory encryption keys block Host OS reading. All sensitive variables inside transit payloads are wrapped in ECIES envelopes, ensuring privacy. | **Protected** |
| **Transaction Replay Attack** | An attacker intercepts a valid envelope/proof and replays it to release duplicate payouts. | The coordinator utilizes `payoutId` as a unique nonce stored in the KV namespace `synod:coord:<payoutId>`. If a duplicate `payoutId` is submitted, the coordinator aborts immediately, preventing replay. | **Protected** |
| **Malicious Specialist / Stake Slasher** | A specialist attempts to falsely claim approval or double-vote. | All specialist decisions are recorded in the consensus trace ledger `synod:step:<actionId>:<stepIndex>` in CCF-replicated KV store. The final receipt is issued as a Verifiable Credential signed with the enclave authority key, preventing repudiation. | **Protected** |
