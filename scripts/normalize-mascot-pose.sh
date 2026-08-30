#!/usr/bin/env bash
# Normalize Beat mascot pose PNGs from caller-provided magenta-backed raw art.
#
# Canonical output: src/assets/mascot/*.png.
# After changing masters, run scripts/sync-mascot-public.sh and commit both the
# canonical copies and public/mascot/*.png. Not a build hook.
#
# Do NOT use global `-transparent white` — that strips eye whites, gloves, and shoes.
set -euo pipefail

# 35% fuzz clears magenta AA fringe; 50% alpha drops residual semi-transparent chroma.
CHROMA_FUZZ=35%
ALPHA_KEEP_THRESHOLD=50%
TARGET_HEIGHT=460
CANVAS=512x512

if [[ $# -ne 2 ]]; then
	echo "Usage: $0 <raw-input.png> <output-name.png>" >&2
	echo "  Writes to src/assets/mascot/ only" >&2
	exit 1
fi

input=$1
output_name=$2
repo_root=$(cd "$(dirname "$0")/.." && pwd)
src_out="${repo_root}/src/assets/mascot/${output_name}"
tmp1=$(mktemp --suffix=.png)
tmp2=$(mktemp --suffix=.png)

cleanup() {
	rm -f "$tmp1" "$tmp2"
}
trap cleanup EXIT

if [[ ! -f "$input" ]]; then
	echo "Error: input file not found: $input" >&2
	exit 1
fi

mkdir -p "${repo_root}/src/assets/mascot"

convert "$input" -fuzz "$CHROMA_FUZZ" -transparent magenta "$tmp1"
convert "$tmp1" \( +clone -alpha extract -threshold "$ALPHA_KEEP_THRESHOLD" \) \
	-compose CopyOpacity -composite "$tmp2"
convert "$tmp2" -trim +repage -resize "x${TARGET_HEIGHT}" -background none \
	-gravity South -extent "$CANVAS" "$tmp1"
# Resize AA can reintroduce magenta fringe — key + hard alpha again on the canvas.
convert "$tmp1" -fuzz 25% -transparent magenta "$tmp2"
convert "$tmp2" \( +clone -alpha extract -threshold "$ALPHA_KEEP_THRESHOLD" \) \
	-compose CopyOpacity -composite -define png:color-type=6 "$src_out"

echo "Wrote ${src_out} — run scripts/sync-mascot-public.sh, then commit both copies."
