#!/usr/bin/env bash
# Normalize Beat mascot pose PNGs from raw generated art (private repo).
#
# Raw sources: private/assets/poses/*-raw.png (magenta backdrop).
# Canonical output: src/assets/mascot/*.png (only copy tracked in git).
# Run `pnpm prebuild` or scripts/sync-mascot-public.sh to copy into public/mascot/.
#
# Do NOT use global `-transparent white` — that strips eye whites, gloves, and shoes.
set -euo pipefail

if [[ $# -ne 2 ]]; then
	echo "Usage: $0 <raw-input.png> <output-name.png>" >&2
	echo "  Writes to src/assets/mascot/ only" >&2
	exit 1
fi

input=$1
output_name=$2
repo_root=$(cd "$(dirname "$0")/.." && pwd)
src_out="${repo_root}/src/assets/mascot/${output_name}"
tmp=$(mktemp --suffix=.png)

mkdir -p "${repo_root}/src/assets/mascot"

convert "$input" -fuzz 6% -transparent magenta "$tmp"

convert "$tmp" -trim +repage -resize 430x430\> -background none -gravity south \
	-extent 512x512 -define png:color-type=6 "$src_out"

rm -f "$tmp"

echo "Wrote ${src_out} (run scripts/sync-mascot-public.sh before build)"
