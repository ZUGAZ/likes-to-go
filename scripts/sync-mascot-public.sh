#!/usr/bin/env bash
# Copy canonical mascot PNGs into WXT public/ for chrome.runtime.getURL paths.
set -euo pipefail

repo_root=$(cd "$(dirname "$0")/.." && pwd)
src_dir="${repo_root}/src/assets/mascot"
dest_dir="${repo_root}/public/mascot"

mkdir -p "$dest_dir"
cp "${src_dir}"/*.png "$dest_dir/"
