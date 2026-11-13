#!/usr/bin/env bash
# Fails when any term from the local, never-committed list appears in tracked files or build output.
# Exit codes: 0 clean, 1 a term was found (printed above), 2 the check itself could not run.
set -euo pipefail

list="$HOME/.config/portfolio-lab/banned-terms.txt"
if [ ! -f "$list" ]; then
  echo "check-banned-terms: missing $list (one term per line); create it before committing." >&2
  exit 2
fi

cd "$(dirname "$0")/.."
found=0

# grep and git grep exit 0 on a match and 1 on none; anything else is an error, never "clean".
scan() {
  local status=0
  "$@" || status=$?
  case $status in
    0) found=1 ;;
    1) ;;
    *)
      echo "check-banned-terms: '$1' failed with exit $status" >&2
      exit 2
      ;;
  esac
}

# Tracked files both as staged and as edited on disk (a file deleted on disk is still checked in the index).
scan git grep --cached -n -i -F -f "$list"
scan git grep -n -i -F -f "$list"

# Build output and anything untracked under public/.
dirs=()
for dir in public .next/server/app .next/static; do
  [ -d "$dir" ] && dirs+=("$dir")
done
if [ ${#dirs[@]} -gt 0 ]; then
  scan grep -rniF -f "$list" -- "${dirs[@]}"
fi

if [ "$found" -eq 1 ]; then
  echo "check-banned-terms: found banned terms (listed above)." >&2
  exit 1
fi
echo "check-banned-terms: clean"
