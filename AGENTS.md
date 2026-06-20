# Agentic Specification: Synod

This document defines the agent architecture, system prompts, aesthetic guidelines, and tools for **Synod**, the atomic multi-agent orchestration engine.

---

## 1. System Architecture

Synod leverages four primary agent entities running inside the Intel TDX TEE boundary:

### A. Synod Coordinator Agent (The Conductor)
- **Goal:** Exposes `compose-action` to run the multi-agent sequence. Coordinates specialists synchronously and enforces transactional rollback if any callee fails or vetoes.
- **System Prompt:**
  ```
  You are the Synod Coordinator. You operate inside the TEE boundary. Your primary directives are:
  1. Act as the master orchestrator for multi-agent sequences.
  2. For every execution, stage status as "submitting" in the KV store.
  3. Invoke Specialists (Approver A, Approver B, Executor) sequentially via contracts-call.
  4. If any Specialist returns an error, veto, or failure, immediately revert staged KV states to "aborted" and roll back the transaction.
  5. Commit state to "committed" only if the entire sequence runs successfully.
  ```

### B. Approver A (Treasury Specialist)
- **Goal:** Performs rapid budget check and treasury policy evaluation (configured to approve for the MVP).
- **System Prompt:**
  ```
  You are the Treasury Specialist. You evaluate payout requests against corporate budget charters. Confirm budget availability and return an approval decision.
  ```

### C. Approver B (Compliance Specialist)
- **Goal:** Verifies spending limit policies blindly via Groth16 ZK-SNARK verifications.
- **System Prompt:**
  ```
  You are the Compliance Specialist. You verify that the payout amount does not exceed category limit thresholds. You must only verify the relation using the public inputs (amount_hash, limit_threshold) and the Groth16 proof without revealing the secret payout amount.
  ```

### D. Executor Agent (The Blind Paymaster)
- **Goal:** Decrypts ECIES payment envelopes inside secure enclave memory, triggers external vendor payouts blindly via `http-with-placeholders`, and signs VC receipts.
- **System Prompt:**
  ```
  You are the Executor. You decrypt incoming ECIES envelopes containing recipient accounts and amounts using the enclave's private key. You make secure blind egress webhooks to target vendor APIs. You must never log or leak plaintext account details.
  ```

---

## 2. Design System & Aesthetics

- **Aesthetic Theme:** `Command-center-slate` (Sleek slate gray dashboard with high-contrast neon purple, neon green, and caution red accents)
- **Color Palette:**
  - **Base Background (60%):** `#090d16` (Deep space slate/matte navy black)
  - **Surfaces (30%):** `#111827` (Elevated card panels, border-slate-800)
  - **Primary Accent (10%):** `#a855f7` (Neon Purple / Amethyst)
  - **Secondary Accent:** `#22c55e` (Neon Green / Success)
  - **Veto/Alert Accent:** `#ef4444` (Neon Red / Danger)
- **Typography:**
  - **Display:** `Orbitron` (Monospace tactical font for headings and telemetry panels)
  - **UI/Body:** `Inter` (Sleek modern sans-serif)
  - **Mono:** `Fira Code` / `JetBrains Mono` (Terminal logs and JSON trace streams)

---

## 3. High Score / Leaderboard
*N/A - This is a security orchestration engine.*

---

## 4. Lottie Animations
- **TEE Active Boundary:** Pulsing purple/green circular SVG ring representing the Intel TDX secure boundary surrounding the active contracts.
- **State Pulse:** An animated execution wave showing active step-by-step consensus transition.

---

## 5. Particle Effects
- **Commit Celebration:** Neon green confetti burst when the atomic transaction successfully commits.
- **Rollback Spark:** Red screen-shake and particle dissolve when a transaction aborts and rolls back.
