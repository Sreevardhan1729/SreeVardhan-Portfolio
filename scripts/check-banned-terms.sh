#!/usr/bin/env bash
# Fails when any term from the local, never-committed list appears in tracked files or build output.
set -euo pipefail

list="$HOME/.config/portfolio-lab/banned-terms.txt"
if [ ! -f "$list" ]; then
  echo "check-banned-terms: missing $list (one term per line); create it before committing." >&2
  exit 2
fi

cd "$(dirname "$0")/.."
targets=()
while IFS= read -r file; do targets+=("$file"); done < <(git ls-files)
[ -d public ] && targets+=(public)
for dir in .next/server/app .next/static; do
  [ -d "$dir" ] && targets+=("$dir")
done

if grep -rniF -f "$list" -- "${targets[@]}" 2>/dev/null; then
  echo "check-banned-terms: found banned terms (listed above)." >&2
  exit 1
fi
echo "check-banned-terms: clean"
