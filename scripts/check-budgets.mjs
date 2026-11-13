// Checks the size budgets from the design: first-load JS for / and the two WebAssembly modules.
// Run after `pnpm build`.
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { gzipSync } from "node:zlib"

const root = resolve(import.meta.dirname, "..")
// The design's first guess was 130 KB, but React DOM plus the Next.js 16 router alone measure about 134 KB
// gzip on this stack, so the budget is that baseline plus about 30 KB of the site's own code.
const budgets = { firstLoadJsGzip: 165 * 1024, forgedbBrotli: 300_000, gatewayBrotli: 1_000_000 }

const html = readFileSync(resolve(root, ".next/server/app/index.html"), "utf8")
// Scripts marked nomodule (legacy polyfills) are never downloaded by modern browsers, so they don't count.
const scripts = [
  ...new Set(
    [...html.matchAll(/<script([^>]*)src="(\/_next\/static\/[^"]+\.js)"([^>]*)>/g)]
      .filter((m) => !/nomodule/i.test(m[1] + m[3]))
      .map((m) => m[2]),
  ),
]
let firstLoad = 0
for (const src of scripts) {
  const file = resolve(root, ".next", decodeURIComponent(src.replace(/^\/_next\//, "")))
  if (!existsSync(file)) throw new Error(`script referenced by / is missing from the build: ${src}`)
  firstLoad += gzipSync(readFileSync(file)).length
}

const manifest = JSON.parse(readFileSync(resolve(root, "public/wasm/manifest.json"), "utf8"))
const rows = [
  ["First-load JS for / (gzip)", firstLoad, budgets.firstLoadJsGzip],
  ["forgedb.wasm (brotli)", manifest.forgedb.brotliBytes, budgets.forgedbBrotli],
  ["gateway.wasm (brotli)", manifest.gateway.brotliBytes, budgets.gatewayBrotli],
]

let failed = false
for (const [label, bytes, budget] of rows) {
  const ok = bytes <= budget
  failed ||= !ok
  console.log(`${ok ? "ok  " : "OVER"}  ${label}: ${(bytes / 1024).toFixed(1)} KB of ${(budget / 1024).toFixed(0)} KB`)
}
console.log(`(${scripts.length} scripts on /)`)
process.exit(failed ? 1 : 0)
