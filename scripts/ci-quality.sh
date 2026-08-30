#!/usr/bin/env bash
set -euo pipefail

# Local quality gate. Superset of the GitHub Actions "quality" job
# (.github/workflows/ci.yml): lint → typecheck → unit tests → knip →
# release-equivalent package guard. Additionally verifies mascot WebP
# regeneration against this environment's ImageMagick/libwebp (not mirrored
# on GitHub runners — those builds produce different bytes).
# Run before release (or anytime locally).

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

echo "==> Lint (pnpm lint)"
pnpm lint

echo "==> Typecheck (pnpm test:types)"
pnpm test:types

echo "==> Unit tests (pnpm test:run)"
pnpm test:run

echo "==> Dead code (pnpm knip)"
pnpm knip

echo "==> Mascot WebP regeneration (pnpm optimize:mascot:check)"
pnpm optimize:mascot:check

echo "==> Release-equivalent package (pnpm ci:release-equivalent)"
pnpm ci:release-equivalent

echo "==> CI quality checks passed"
