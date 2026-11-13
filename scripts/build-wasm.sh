#!/usr/bin/env bash
# Builds the WebAssembly demos from the commits pinned in wasm/sources.json and writes
# public/wasm/. Run on a Mac with em++ (and TinyGo or Go); Vercel only serves the output.
# Usage: scripts/build-wasm.sh [forgedb|gateway]   (no argument builds both)
set -euo pipefail

cd "$(dirname "$0")/.."
root=$PWD
target=${1:-all}
build_dir="$root/wasm/.build"
out_dir="$root/public/wasm"
mkdir -p "$build_dir" "$out_dir"

source_field() { node -e "console.log(require('./wasm/sources.json')['$1']['$2'])"; }

# Fetch exactly one commit of a repo into wasm/.build/<name>.
fetch_source() {
  local name=$1 repo sha dir
  repo=$(source_field "$name" repo)
  sha=$(source_field "$name" sha)
  dir="$build_dir/$name"
  rm -rf "$dir"
  git init -q "$dir"
  git -C "$dir" fetch -q --depth 1 "$repo" "$sha"
  git -C "$dir" checkout -q FETCH_HEAD
}

brotli_bytes() { node -e "console.log(require('zlib').brotliCompressSync(require('fs').readFileSync('$1')).length)"; }

build_forgedb() {
  fetch_source forgedb
  local src="$build_dir/forgedb/src"
  em++ -O3 -std=c++17 \
    -I"$src" \
    "$src/command_handler.cpp" "$src"/commands/*.cpp "$src/datastore.cpp" \
    "$src/resp_parser.cpp" "$src/resp_serializer.cpp" "$src/utils.cpp" \
    wasm/forgedb/shim.cpp wasm/forgedb/stubs.cpp \
    -sMODULARIZE=1 -sEXPORT_ES6=1 -sENVIRONMENT=web,node -sALLOW_MEMORY_GROWTH=1 -sFILESYSTEM=0 \
    -sEXPORTED_FUNCTIONS=_forgedb_exec,_forgedb_reply_len,_forgedb_sweep,_forgedb_aof_drain,_forgedb_aof_len,_malloc,_free \
    -sEXPORTED_RUNTIME_METHODS=HEAPU8 \
    -o "$out_dir/forgedb.mjs"

  local commands
  commands=$(grep -oE '\{"[A-Z]+",[[:space:]]*handle' "$src/command_handler.cpp" | sed -E 's/\{"([A-Z]+)".*/\1/' | node -e \
    "console.log(JSON.stringify(require('fs').readFileSync(0,'utf8').trim().split('\n')))")
  FORGEDB_SHA=$(source_field forgedb sha) FORGEDB_COMMANDS=$commands \
    FORGEDB_BROTLI=$(brotli_bytes "$out_dir/forgedb.wasm") \
    pnpm exec tsx scripts/record-session.mts
}

case "$target" in
  forgedb) build_forgedb ;;
  all) build_forgedb ;;
  *) echo "unknown target: $target" >&2; exit 2 ;;
esac
