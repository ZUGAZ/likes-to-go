#!/usr/bin/env bash
set -euo pipefail

# Local e2e gate. Mirrors the GitHub Actions "e2e" job
# (.github/workflows/ci.yml): pinned Chromium + system deps, production
# unpack, then mock-export Playwright (no dev server, Storybook, or live
# SoundCloud).
# Run anytime locally; CI never uses an auth profile or credentials.

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

echo "==> Playwright Chromium + system deps"
pnpm exec playwright install --with-deps chromium

echo "==> Production unpack (pnpm build)"
pnpm build

echo "==> Mock export E2E (pnpm test:e2e:ci)"
pnpm test:e2e:ci

echo "==> CI e2e checks passed"
