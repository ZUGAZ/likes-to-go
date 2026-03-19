#!/usr/bin/env bash
set -euo pipefail

# 1. Ensure there are staged changes
if git diff --cached --quiet; then
	echo "No staged changes. Stage files first (git add ...), then run pnpm commit."
	exit 1
fi

# 2. Format staged files with Prettier via lint-staged
echo "Formatting staged files with lint-staged..."
pnpm lint-staged

# 3. Run typecheck and tests (non-watch)
echo "Running typecheck (pnpm test:types)..."
pnpm test:types

echo "Running tests (pnpm test:run)..."
pnpm test:run

# 4. Show staged diff summary
#echo
#echo "=== Staged changes ==="
#git diff --cached --stat
#echo
#echo "Opening commit editor. You can write your message or use Cursor to generate one."
#echo "The existing commit-msg hook will validate the conventional commit format."
#echo

# 5. Open interactive commit editor
#if [ -z "${GIT_EDITOR:-}" ] && command -v cursor >/dev/null 2>&1; then
#	export GIT_EDITOR="cursor --wait"
#fi

#git commit

