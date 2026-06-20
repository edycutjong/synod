# Terminal 3 ADK — Onboarding Bug & Documentation Audit

> Submitted for the **Terminal 3 ADK Dev Challenge 2026 — Track 2 (Bug Bounty)**.
>
> Concrete onboarding blockers and documentation gaps found while building **Synod**
> (and the wider Vouch Suite: Epoch, Lethe, Silo, Synod, Visor) against the T3 ADK host
> APIs and SDK. Each entry lists where it bit us in Synod and the workaround we shipped.

> 🔬 **See [SDK_AUDIT.md](SDK_AUDIT.md)** for **confirmed, code-cited security findings** verified directly from the *real published* `@terminal3` VC packages via `npm pack` (hardcoded BBS `nonce` → proof replay, revocation bypass, no holder/challenge binding). The list below is integration/documentation gaps; the audit is reproducible SDK bugs.

| # | Area | Type | Severity |
|---|---|---|---|
| 1 | `metamask_sign` | Undocumented param | Low |
| 2 | `kv-store` | Interface discrepancy | High |
| 3 | `clock` | Method name mismatch | High |
| 4 | `signing` | Missing WIT helper | Medium |
| 5 | `loadWasmComponent` | Opaque path resolution | Medium |
| 6 | tenant DID | Hex double-encoding trap | High |
| 7 | public KV route | Missing spec (CORS/cache/pagination) | Low |
| 8 | transactions | Rollback semantics undocumented | High |
| 9 | `outbox` | Idempotency lifecycle undocumented | Medium |
| 10 | `contracts-call` | Nested-revert & reentrancy semantics undocumented | High |

---

## Bug #1 — Undocumented second parameter in `metamask_sign`
**Type:** Documentation · **Severity:** Low

`EthSign: metamask_sign(address, undefined, T3N_API_KEY)` never documents the second positional argument, blocking custom wallet bindings. **Ask:** document its type/values or use a named options object.

## Bug #2 — `kv-store` interface discrepancy (map-name vs. flat keys)
**Type:** Interface · **Severity:** High

WIT declares `get(map-name, key)` but the C ABI is flat `(key_ptr, key_len)`. **Where it bit us:** Synod stores transactional staging state (`submitting`/`committed`/`aborted`) and per-step traces through the flat shape. **Ask:** make the WIT and C ABI agree.

## Bug #3 — Clock API method-name mismatch
**Type:** Interface · **Severity:** High

Docs say `host_clock_now() -> u64`; WIT requires `now-ms() -> result<u64, clock-error>`, breaking `wasm32-wasip2` builds. **Ask:** align docs with WIT and state the target triple per example.

## Bug #4 — Missing `host_signing_issue_vc` in the `signing` WIT
**Type:** Interface · **Severity:** Medium

Templates call `host_signing_issue_vc`, but WIT only exposes raw `sign`. **Ask:** add a VC helper or document the canonical recipe over `sign`.

## Gap #5 — Opaque `loadWasmComponent()` path resolution
**Type:** Documentation · **Severity:** Medium

`loadWasmComponent()` is called with no args and no documented resolution base/override. **Where it bit us:** Synod loads multiple approver contracts and needs deterministic resolution. **Ask:** document the base path and an override.

## Gap #6 — Tenant DID hex double-encoding trap
**Type:** Correctness · **Severity:** High

`format!("z:{}:secrets", hex::encode(&tid))` double-encodes when `tenant_did()` returns a string, breaking KV routing. **Ask:** clarify the return type and correct derivation.

## Gap #7 — Public KV route specification
**Type:** Documentation · **Severity:** Low

`/api/dev/public-kv/<tid>/<tail>` is mentioned with no CORS, cache, or pagination spec. **Ask:** publish them.

## Gap #8 — Transaction rollback semantics undocumented
**Type:** Documentation · **Severity:** High

It is unspecified what an `Err` return rolls back. **Where it bit us:** Synod's entire premise is atomic multi-agent consensus — a single approver veto must revert **all** KV staging writes across the Treasury, Compliance, and Executor agents. We enforce this in guest code, but the host rollback boundary is undocumented. **Ask:** document exactly what an `Err` reverts.

## Gap #9 — `outbox` idempotency lifecycle undocumented
**Type:** Documentation · **Severity:** Medium

The dedup window/TTL and overflow behavior of the `idk` key are undocumented. **Ask:** document them.

## Gap #10 — `contracts-call` nested-revert & reentrancy semantics undocumented
**Type:** Correctness · **Severity:** High

`host_contracts_call` invokes another contract synchronously, but the docs do not specify: (a) whether a callee's `Err`/panic **atomically reverts** the caller's already-written KV state, (b) the maximum call depth, or (c) whether reentrant calls back into the caller are permitted. **Where it bit us:** Synod's Coordinator invokes Treasury → Compliance → Executor in one transaction and relies on a callee veto reverting the whole tree; we had to assume nested atomicity and add guest-side guards because the contract is silent. **Ask:** document nested-revert atomicity, max depth, and reentrancy rules for `contracts-call`.
