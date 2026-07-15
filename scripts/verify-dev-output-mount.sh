#!/usr/bin/env bash
# Verify WXT dev output reaches the host via /host-extension bind mount + symlink.
set -euo pipefail

HOST_EXT="/host-extension"
OUTPUT_DIR="/workspaces/likes-to-go/public/.output/chrome-mv3-dev"

if ! command -v findmnt >/dev/null 2>&1; then
	echo "verify-dev-output-mount: findmnt not available; skipping mount check"
	exit 0
fi

if [[ ! -d "$HOST_EXT" ]]; then
	echo "ERROR: $HOST_EXT is not mounted — host bind mount failed at container start."
	echo "Rebuild the devcontainer (docker-compose). Check .devcontainer/devcontainer.env:"
	echo "  HOST_EXTENSION_DIR=C:/Users/.../sound cloud likes/.extension"
	echo "Fallback (Windows host PowerShell): .devcontainer/sync-extension-from-container.ps1"
	exit 1
fi

HOST_FSTYPE="$(findmnt -T "$HOST_EXT" -no FSTYPE 2>/dev/null || true)"
if [[ "$HOST_FSTYPE" == "ext4" || "$HOST_FSTYPE" == "xfs" ]]; then
	echo "ERROR: $HOST_EXT is on volume filesystem ($HOST_FSTYPE), not a host bind mount."
	echo "Docker cannot bind-mount inside a named volume; /host-extension must be a top-level mount."
	exit 1
fi

if [[ ! -L "$OUTPUT_DIR" ]]; then
	echo "ERROR: $OUTPUT_DIR is not a symlink to $HOST_EXT."
	echo "Run: bash /workspaces/likes-to-go/private/.devcontainer/link-host-extension.sh"
	exit 1
fi

RESOLVED_OUTPUT="$(readlink -f "$OUTPUT_DIR")"
RESOLVED_HOST="$(readlink -f "$HOST_EXT")"
if [[ "$RESOLVED_OUTPUT" != "$RESOLVED_HOST" ]]; then
	echo "ERROR: symlink mismatch — $OUTPUT_DIR -> $RESOLVED_OUTPUT (expected $RESOLVED_HOST)"
	exit 1
fi

if [[ ! -f "$OUTPUT_DIR/manifest.json" ]]; then
	echo "WARN: host mount and symlink OK but manifest.json missing — WXT will create it on start."
	exit 0
fi

echo "OK: dev output reachable on host via $OUTPUT_DIR -> $HOST_EXT"
