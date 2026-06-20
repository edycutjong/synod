# Golden Path — 2-Minute Reviewer Quickstart (Synod)

> For judges: see the whole **atomic multi-agent consensus** flow end-to-end with **zero credentials, no API keys, no external services**. Everything runs locally against the bundled Rust→WASM enclave contracts.

## Choose your path

| Goal | Command | Time | Credentials |
|------|---------|------|-------------|
| **See it all pass** (lint, types, Rust + UI tests, e2e) | `make bootstrap && make ci` | ~2 min | None |
| **Click through the UI** | `cd ui && npm run dev` → http://localhost:3000 | ~2 min | None |
| **Seed demo data** | `make seed` (or `npm run seed`) | ~10 s | None |
| **Read the full walkthrough** | [DEMO.md](DEMO.md) | — | — |

## The 2-minute demo (UI)

1. **Propose a transaction** — submit a treasury payout that must clear policy (e.g. an amount + category).
2. **Watch the consensus** — the Coordinator invokes the **Treasury → Compliance → Executor** agents synchronously via **`contracts-call`**, in one TEE transaction. Staging state moves through `submitting → committed` in **`kv-store`**.
3. **Approve path** — all agents approve → the transaction **commits atomically** and you get a single consistent result.
4. **Veto path** — flip the Compliance agent to veto (it checks the spend threshold *blindly*) → the **entire transaction reverts** with **zero residual state**: no partial commit, status `aborted`.

The whole point is that a **single veto rolls back the entire tree** — that atomicity is what `contracts-call` provides.

## What's real vs simulated
- **Real:** the Rust→WASM enclave contracts coordinated by a synchronous `contracts-call` transaction with single-veto atomic rollback, and `kv-store` staging state.
- **Simulated (local sandbox):** the Terminal 3 host APIs, approver identities, and ZK compliance checks (seeded test data); no funds move. See the "Hackathon Simulation Context" banner in the app.

## Bug-bounty track
See **[SDK_AUDIT.md](SDK_AUDIT.md)** — confirmed, code-cited security findings verified from the real published `@terminal3` VC packages — and **[BUGS.md](BUGS.md)** for integration/doc gaps.
