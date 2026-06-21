.PHONY: help bootstrap build test lint typecheck ci e2e lighthouse security-scan repo-details version-patch version-minor version-major

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
	@echo "repo-details     - Update the GitHub repository details (description, website, topics)"
	@echo "version-patch    - Bump version by patch (x.y.Z+1)"
	@echo "version-minor    - Bump version by minor (x.Y+1.0)"
	@echo "version-major    - Bump version by major (X+1.0.0)"


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

repo-details:
	gh repo edit edycutjong/synod --description "Atomic multi-agent transactional orchestration engine running inside Intel TDX TEE boundary with 100% cryptographic rollback guarantees, powered by Terminal 3 ADK." --homepage "https://synod.edycu.dev" --add-topic "nextjs,react,wasm,tee,intel-tdx,multi-agent,governance,secp256k1,cryptography,hackathon,terminal3"

version-patch:
	PATH="/opt/homebrew/bin:$$PATH" node scripts/bump-version.js patch
	git add .
	git commit -m "chore(release): bump version to $$(PATH="/opt/homebrew/bin:$$PATH" node -p "require('./package.json').version")"

version-minor:
	PATH="/opt/homebrew/bin:$$PATH" node scripts/bump-version.js minor
	git add .
	git commit -m "chore(release): bump version to $$(PATH="/opt/homebrew/bin:$$PATH" node -p "require('./package.json').version")"

version-major:
	PATH="/opt/homebrew/bin:$$PATH" node scripts/bump-version.js major
	git add .
	git commit -m "chore(release): bump version to $$(PATH="/opt/homebrew/bin:$$PATH" node -p "require('./package.json').version")"


