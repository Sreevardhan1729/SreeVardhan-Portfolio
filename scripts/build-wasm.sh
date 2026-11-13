#!/usr/bin/env bash
# Builds the WebAssembly demos from the commits pinned in wasm/sources.json and writes
# public/wasm/. Run on a Mac with em++ and TinyGo (or Go); Vercel only serves the output.
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

build_gateway() {
  fetch_source gateway
  local pkg="$root/wasm/gateway/gateway" file
  # The demo compiles these three files unchanged; fail if the committed copies drift from the pin.
  for file in backend.go ratelimiter.go queue.go; do
    if ! cmp -s "$build_dir/gateway/gateway/$file" "$pkg/$file"; then
      echo "wasm/gateway/gateway/$file differs from the pinned commit; copy it from $build_dir/gateway/gateway/" >&2
      exit 1
    fi
  done

  local toolchain
  if command -v tinygo >/dev/null && (cd wasm/gateway && tinygo build -target wasm -opt=z -no-debug -o "$out_dir/gateway.wasm" .); then
    cp "$(tinygo env TINYGOROOT)/targets/wasm_exec.js" "$out_dir/gateway-wasm-exec.js"
    toolchain="tinygo $(tinygo version | awk '{print $3}')"
  else
    (cd wasm/gateway && GOOS=js GOARCH=wasm go build -ldflags="-s -w" -o "$out_dir/gateway.wasm" .)
    cp "$(go env GOROOT)/lib/wasm/wasm_exec.js" "$out_dir/gateway-wasm-exec.js"
    toolchain=$(go version | awk '{print $3}')
  fi

  GATEWAY_SHA=$(source_field gateway sha) GATEWAY_TOOLCHAIN=$toolchain \
    GATEWAY_BROTLI=$(brotli_bytes "$out_dir/gateway.wasm") node -e '
      const fs = require("fs")
      const path = "public/wasm/manifest.json"
      const manifest = fs.existsSync(path) ? JSON.parse(fs.readFileSync(path, "utf8")) : {}
      manifest.gateway = { sha: process.env.GATEWAY_SHA, toolchain: process.env.GATEWAY_TOOLCHAIN, brotliBytes: Number(process.env.GATEWAY_BROTLI) }
      fs.writeFileSync(path, JSON.stringify(manifest, null, 2) + "\n")
      console.log(`gateway: ${manifest.gateway.brotliBytes} bytes brotli, built with ${manifest.gateway.toolchain}`)'
}

case "$target" in
  forgedb) build_forgedb ;;
  gateway) build_gateway ;;
  all) build_forgedb; build_gateway ;;
  *) echo "unknown target: $target" >&2; exit 2 ;;
esac
