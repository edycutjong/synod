.PHONY: help bootstrap build test lint typecheck ci e2e lighthouse security-scan

help:
	@echo "Synod Build and Testing Automation Harness"
	@echo "=========================================="
	@echo "bootstrap        - Install all dependencies in all subfolders"
	@echo "build            - Compile all packages (SDK, Contract, UI)"
	@echo "test             - Run unit and integration tests (Contract, UI)"
	@echo "lint             - Run ESLint checks on the Next.js UI"
	@echo "typecheck        - Verify TypeScript type safety in all subfolders"
	@echo "ci               - Run the core CI checks (lint, typecheck, test)"
	@echo "e2e              - Execute Playwright end-to-end tests (demo mode)"
	@echo "lighthouse       - Run Lighthouse CI audit on the UI dashboard"
	@echo "security-scan    - Run vulnerability audits and license compliance checks"

bootstrap:
	npm run bootstrap

build:
	npm run build

test:
	npm run test

lint:
	npm run lint

typecheck:
	npm run typecheck

ci:
	npm run ci

e2e:
	npm run e2e

lighthouse:
	npm run lighthouse

security-scan:
	@echo "🔍 Running NPM Audit..."
	npm run audit
	@echo "🔍 Running License Checker..."
	npx license-checker --production --failOn "GPL-3.0;AGPL-3.0" --summary || true
