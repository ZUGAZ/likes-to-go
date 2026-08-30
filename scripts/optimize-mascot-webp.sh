#!/usr/bin/env bash
# Generate deterministic 64-colour quantized lossless WebP poses from
# canonical 512×512 PNG masters. Writes public/mascot/*.webp.
#
# After changing masters, run this script (or the compatibility wrapper
# scripts/sync-mascot-public.sh) and commit both the canonical PNG masters
# and public/mascot/*.webp. Not a build hook.
#
# Never crop, trim, or resize. Dithering is disabled (+dither). WebP is
# lossless. Requires ImageMagick 6 `convert`/`identify` with a native WebP coder.
set -euo pipefail

POSES=(idle working happy sad)
TARGET_DIM=512

repo_root=$(cd "$(dirname "$0")/.." && pwd)
src_dir="${repo_root}/src/assets/mascot"
dest_dir="${repo_root}/public/mascot"
check_mode=false
stage=""

usage() {
	echo "Usage: $0 [--check] [--dest DIR]" >&2
	echo "  Writes public/mascot/*.webp from src/assets/mascot/*.png" >&2
	echo "  --check  Generate into a temp dir and byte-compare against dest" >&2
	echo "  --dest   Output directory (default: <repo>/public/mascot)" >&2
}

cleanup() {
	if [[ -n "$stage" && -d "$stage" ]]; then
		rm -rf "$stage"
	fi
}
trap cleanup EXIT

while [[ $# -gt 0 ]]; do
	case "$1" in
	--check)
		check_mode=true
		shift
		;;
	--dest)
		if [[ $# -lt 2 ]]; then
			echo "Error: --dest requires a directory path" >&2
			exit 1
		fi
		dest_dir=$2
		shift 2
		;;
	-h | --help)
		usage
		exit 0
		;;
	*)
		echo "Error: unknown argument: $1" >&2
		usage
		exit 1
		;;
	esac
done

require_tool() {
	local name=$1
	if ! command -v "$name" >/dev/null 2>&1; then
		echo "Error: ${name} is required (ImageMagick 6)" >&2
		exit 1
	fi
}

require_tool convert
require_tool identify

if ! convert -list format | grep -Eq '^[[:space:]]*WEBP'; then
	echo "Error: ImageMagick WebP coder is not available" >&2
	exit 1
fi

if ! convert -list format | grep -Eq '^[[:space:]]*WEBP.*rw'; then
	echo "Error: ImageMagick WebP coder is not writable" >&2
	exit 1
fi

source_path() {
	local pose=$1
	echo "${src_dir}/${pose}.png"
}

require_source_master() {
	local pose=$1
	local src
	src=$(source_path "$pose")
	if [[ ! -f "$src" ]]; then
		echo "Error: missing canonical master: ${src}" >&2
		exit 1
	fi
	local dims
	dims=$(identify -format '%w %h' "$src")
	if [[ "$dims" != "${TARGET_DIM} ${TARGET_DIM}" ]]; then
		echo "Error: ${src} is ${dims}, expected ${TARGET_DIM} ${TARGET_DIM}" >&2
		exit 1
	fi
}

# +dither disables dithering (ImageMagick: +flag turns the option off).
# Quantize to 64 colours, then encode lossless WebP. No geometry changes.
encode_pose_webp() {
	local src=$1
	local dest_webp=$2
	local quantized
	quantized=$(mktemp --suffix=.png)
	convert "$src" +dither -colors 64 PNG32:"$quantized"
	convert "$quantized" -define webp:lossless=true "$dest_webp"
	rm -f "$quantized"
}

verify_generated_webp() {
	local file=$1
	local pose=$2
	if [[ ! -f "$file" ]]; then
		echo "Error: optimizer did not write ${file}" >&2
		exit 1
	fi
	local info
	info=$(identify -format '%w %h %m' "$file")
	if [[ "$info" != "${TARGET_DIM} ${TARGET_DIM} WEBP" ]]; then
		echo "Error: ${pose} output is ${info}, expected ${TARGET_DIM} ${TARGET_DIM} WEBP" >&2
		exit 1
	fi
}

generate_all() {
	local out_dir=$1
	mkdir -p "$out_dir"
	local pose src dest
	for pose in "${POSES[@]}"; do
		require_source_master "$pose"
		src=$(source_path "$pose")
		dest="${out_dir}/${pose}.webp"
		encode_pose_webp "$src" "$dest"
		verify_generated_webp "$dest" "$pose"
	done
}

expected_name() {
	local pose=$1
	echo "${pose}.webp"
}

is_expected_name() {
	local name=$1
	local pose
	for pose in "${POSES[@]}"; do
		if [[ "$name" == "$(expected_name "$pose")" ]]; then
			return 0
		fi
	done
	return 1
}

compare_dest() {
	local generated_dir=$1
	local published_dir=$2
	local failed=false
	local pose name generated published

	for pose in "${POSES[@]}"; do
		name=$(expected_name "$pose")
		generated="${generated_dir}/${name}"
		published="${published_dir}/${name}"
		if [[ ! -f "$published" ]]; then
			echo "Error: missing expected file: ${published}" >&2
			failed=true
			continue
		fi
		if ! cmp -s "$generated" "$published"; then
			echo "Error: ${published} does not match regeneration (drift)" >&2
			failed=true
		fi
	done

	if [[ -d "$published_dir" ]]; then
		local extra
		while IFS= read -r extra; do
			if [[ -z "$extra" ]]; then
				continue
			fi
			if ! is_expected_name "$extra"; then
				echo "Error: extra file in ${published_dir}: ${extra}" >&2
				failed=true
			fi
		done < <(find "$published_dir" -type f -printf '%P\n' | LC_ALL=C sort)
	fi

	if [[ "$failed" == true ]]; then
		exit 1
	fi
}

publish_dest() {
	local generated_dir=$1
	local published_dir=$2
	mkdir -p "$published_dir"
	local pose name
	for pose in "${POSES[@]}"; do
		name=$(expected_name "$pose")
		mv -f "${generated_dir}/${name}" "${published_dir}/${name}"
	done
	# Drop superseded public PNG copies for the same pose keys.
	for pose in "${POSES[@]}"; do
		rm -f "${published_dir}/${pose}.png"
	done
}

stage=$(mktemp -d)
generate_all "$stage"

if [[ "$check_mode" == true ]]; then
	compare_dest "$stage" "$dest_dir"
	echo "Checked ${dest_dir} — all four WebP poses match regeneration."
else
	publish_dest "$stage" "$dest_dir"
	echo "Wrote ${dest_dir}/*.webp — commit canonical PNG masters and public WebP copies."
fi
