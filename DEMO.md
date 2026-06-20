# Synod — Demo Protocol

This guide walks through the step-by-step demo protocol for judges to reproduce and verify **Synod** functionality.

---

## 1. Setup & Environment
- **Prerequisites:** Node.js ≥ 20.9.0, Rust, and the Terminal 3 Local Sandbox CLI installed.
- **Run Seeding:**
  ```bash
  python3 scripts/seed.py
  ```
  *This registers the mock specialist agent configurations and seeds the test payouts.*

---

## 2. Step-by-Step Walkthrough

### Step 1: The Rollback Case (Veto)
1. Open the UI at `http://localhost:3000`.
2. Locate the **Payout Composer** and select **Payout #2281** (Amount: `$15,000` - exceeds the compliance auditor limit of `$10,000`).
3. Click **Deploy Multi-Agent Tx**.
4. Watch the live **Orchestration Timeline**:
   - `Approver A` (Treasury Checker) flashes green: `APPROVED` ✅
   - `Approver B` (Compliance Auditor) flashes red: `VETOED` (Veto Reason: Amount exceeds limit of $10,000) ❌
   - The coordinator flashes red: `ROLLBACK TRIGGERED`.
5. Check the database trace log in the panel: it prints `State Reverted. Staged keys deleted. Zero side effects.`

### Step 2: The Commit Case (Approval)
1. In the composer, select **Payout #2282** (Amount: `$5,000`).
2. Click **Deploy Multi-Agent Tx**.
3. Watch the live timeline:
   - `Approver A` (Treasury) flashes green: `APPROVED` ✅
   - `Approver B` (Compliance) flashes green: `APPROVED` ✅
   - `Executor` flashes green: `EXECUTED` ✅
4. The panel displays the generated **Composite Receipt** VC. Click **Verify VC** to run the in-contract signature check. A green badge confirms signature validation.
5. Check the webhook console: it logs the payout post containing the recipient's real email, substituted securely by T3 at egress.
