#!/usr/bin/env bash
# Manual regeneration: copy canonical mascot PNGs into WXT public/ for
# chrome.runtime.getURL paths. Not a build hook — after running this, commit
# both src/assets/mascot/*.png and public/mascot/*.png.
set -euo pipefail

repo_root=$(cd "$(dirname "$0")/.." && pwd)
src_dir="${repo_root}/src/assets/mascot"
dest_dir="${repo_root}/public/mascot"

mkdir -p "$dest_dir"
cp "${src_dir}"/*.png "$dest_dir/"
echo "Wrote ${dest_dir}/*.png — commit both canonical and public copies."
