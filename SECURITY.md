# Security Policy

## Supported Versions

Synod is currently in active development. We actively monitor and maintain the `main` branch.

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1.0 | :x:                |

## Reporting a Vulnerability

We take the security of Synod seriously, especially given its role as an atomic multi-agent orchestration engine coordinating treasury, compliance (ZK-SNARK), and payment execution agents inside Intel TDX enclaves.

If you discover a security vulnerability within Synod, please do not disclose it publicly. Instead, follow these steps to report it responsibly:

1. Go to the [Security Advisories](../../security/advisories) tab on GitHub.
2. Click **Report a vulnerability**.
3. Provide a detailed description of the vulnerability, including steps to reproduce it, potential impact on atomic transaction state commitments, budget verification bypass, ZK limit proof verification, or ECIES decryption logic.

We will acknowledge receipt of your vulnerability report within 48 hours and strive to resolve the issue responsibly.

## Scope

The following areas are in scope for security reports:
- The Next.js dashboard and API routes (`src/`)
- The Rust/WASM TEE contract (`contract/`)
- The local SDK interface (`sdk/`)
- The CLI tool (`cli/`)
- Enclave agent coordination and rollback logic

Thank you for helping keep Synod secure!
