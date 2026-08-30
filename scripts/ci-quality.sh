#!/usr/bin/env bash
set -euo pipefail

# Mirrors the GitHub Actions "quality" job (.github/workflows/ci.yml):
# lint → typecheck → unit tests → release-equivalent package guard.
# Run before release (or anytime locally).

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

echo "==> Lint (pnpm lint)"
pnpm lint

echo "==> Typecheck (pnpm test:types)"
pnpm test:types

echo "==> Unit tests (pnpm test:run)"
pnpm test:run

echo "==> Release-equivalent package (pnpm ci:release-equivalent)"
pnpm ci:release-equivalent

echo "==> CI quality checks passed"
