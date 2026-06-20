# Developer Experience (DX) & SDK Friction Report: Synod

This report logs the developer experience, onboarding friction points, and gaps identified when integrating with the **Terminal 3 Agent Dev Kit (ADK)** during the design and development of the Synod atomic multi-agent orchestration engine.

---

## 1. Onboarding & Integration Friction Points

### 1.1 Local Sandbox Testing Environment
* **Friction:** Running hardware-isolated enclaves locally for dev/test loops is complex. Since local TEE/TDX execution enclaves require specialized SGX/TDX-enabled host CPUs, setting up a fully mock local sandbox environment that accurately models remote attestation and ephemeral hardware key generation is challenging.
* **Workaround:** Synod solved this by building a Next.js Gateway API wrapper mimicking enclave memory state registers, KV namespaces, and signing thresholds. A standardized local simulator is highly desirable in the official T3 SDK.

### 1.2 Host API Module Resolution
* **Friction:** In hybrid Next.js/React architectures (where the client console triggers the agent workflows), Node-native dependencies (like Node's core `crypto` module used for Secp256k1 ECIES envelope key generation) cause severe bundler resolution failures on Webpack/Vite client-side compilations.
* **Workaround:** Synod solved this by implementing a hybrid/delegated crypto architecture in `src/lib/crypto.ts` that detects browser execution and delegates cryptographic calculations to lightweight server-side proxy routes (`/api/integrations/encrypt` and `/api/integrations/zk-proof`), preserving native JS speed.

---

## 2. Technical Limitations & Gaps in the Sponsor SDK

We identified three critical engineering constraints within the current Terminal 3 ADK:

### 2.1 Cross-Contract Call Depth Boundary
* **Limitation:** The `contracts-call` API enforces a hard restriction preventing recursive call loops deeper than **3 stack levels** (e.g., Coordinator $\to$ Specialist $\to$ Leaf Specialist $\to$ External Contract).
* **Impact:** Monolithic agent flows must be refactored into flat star topologies. Synod adheres to a flat coordinator-leaf design to prevent stack exhaustion aborts.

### 2.2 Strict Calldata Interface Encoding
* **Limitation:** Host contract calls require strict, statically typed interface serialization schema matching. Dynamic structures or flexible JSON outputs can cause silent VM execution crashes if signatures are off by a single byte.
* **Impact:** Synod handles this by wrapping all inter-agent communications in a unified JSON envelope with standardized string fields and handling serialization bounds explicitly.

### 2.3 Lack of Dynamic Error Propagation
* **Limitation:** If a child specialist contract crashes or runs out of gas, the parent coordinator hung without receiving the dynamic stack trace or the specific exception type.
* **Impact:** Errors were difficult to debug. Synod resolved this by wrapping leaf contract evaluations with explicit error-recovery bounds and utilizing custom return codes inside the child WASM components.

---

## 3. Recommended SDK Improvements
1. **Universal JS SDK Polyfill:** Provide browser-compatible WASM versions of ECIES key exchange and Groth16 pairings so client consoles can generate proofs and envelopes client-side without relying on server-side gateways.
2. **Standardized Attestation Mocking:** Provide a built-in local development proxy tool that simulates remote attestation verification and JSON-LD Verifiable Credential signature generation.
3. **Structured VM Aborts:** Improve cross-contract error reporting so that when a sub-enclave calls `panic!`, the host VM returns a formatted execution trace back to the calling coordinator.
