#!/usr/bin/env bash
# Compatibility wrapper for scripts/optimize-mascot-webp.sh.
# Regenerates public/mascot/*.webp from canonical PNG masters. Not a build hook.
set -euo pipefail

exec "$(cd "$(dirname "$0")" && pwd)/optimize-mascot-webp.sh" "$@"
