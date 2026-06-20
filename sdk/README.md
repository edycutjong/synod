# Synod SDK (`@edycutjong/synod-sdk`)

TypeScript client SDK for interacting with the Synod multi-agent orchestration engine enclave. Handles client-side cryptography, ECIES envelope encryption, and Groth16 compliance proof compilation.

## Exports

### `SynodClient` Class

```typescript
import { SynodClient } from '@edycutjong/synod-sdk';

const client = new SynodClient({
  enclaveUrl: 'http://localhost:3000'
});
```

#### Core Methods

| Method | Description |
|---|---|
| `encryptPayload(payoutData, enclavePubKey)` | Encrypts payout credentials (accounts, amounts) using ECIES (secp256k1 + AES-256-GCM). |
| `generateZkProof(amount, limit)` | Generates a Groth16 zero-knowledge proof proving that `amount <= limit` without revealing the amount. |
| `composeAction(envelope, proof, limit)` | Submits the staged payload and proof to the coordinator enclave for consensus evaluation. |
| `verifyReceipt(vc)` | Cryptographically verifies a W3C Verifiable Credential receipt. |

## Development

```bash
# Install dependencies
npm install

# Build the TypeScript files
npm run build

# Run unit tests
npm test
```
