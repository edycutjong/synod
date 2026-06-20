# Synod Dashboard UI

Next.js 14 App Router dashboard console for staging, deliberating, and executing multi-agent transactions. It provides a real-time deliberation chamber visualizing the step-by-step specialist approvals, an interactive proposal composer (what-if console), and a split-screen telemetry viewer.

## Main Panels & Route Paths

- `/` — Deliberation Chamber dashboard, presenting the active proposal lifecycle, status meters, and the live TEE log feed.
- `/api/` — API routes acting as host adapters forwarding requests to the simulated local enclave context.

## Telemetry Design System

- **Aesthetic**: `Command-center-slate` (cyberpunk-terminal dashboard).
- **Typography**: Orbitron (display headings) and JetBrains Mono (logs, metrics).
- **Color Codes**: Neon Purple (`#a855f7`) for staged/submit, Neon Green (`#22c55e`) for settled/committed, Neon Red (`#ef4444`) for veto/rollback.

## Development

```bash
# Install package dependencies
npm install

# Start local Next.js dev server
npm run dev

# Run Playwright E2E suites
npx playwright test
```
