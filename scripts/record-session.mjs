// Runs the chip commands against the freshly built ForgeDB module and stores what it printed,
// so the page's pre-load preview matches the live terminal. Also writes the forgedb manifest entry.
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"

const root = resolve(import.meta.dirname, "..")
const manifestPath = resolve(root, "public/wasm/manifest.json")
const chips = JSON.parse(readFileSync(resolve(root, "lib/forgedb/chips.json"), "utf8"))
const encoder = new TextEncoder()
const decoder = new TextDecoder()

// Splits a chip into arguments. Chips only use plain words and double-quoted words.
const splitChip = (line) => [...line.matchAll(/"([^"]*)"|(\S+)/g)].map((m) => m[1] ?? m[2])

const { default: factory } = await import(pathToFileURL(resolve(root, "public/wasm/forgedb.mjs")).href)
const db = await factory()
const exec = (args) => {
  const request = encoder.encode(`*${args.length}\r\n` + args.map((a) => `$${encoder.encode(a).length}\r\n${a}\r\n`).join(""))
  const ptr = db._malloc(request.length)
  db.HEAPU8.set(request, ptr)
  const out = db._forgedb_exec(ptr, request.length)
  db._free(ptr)
  return decoder.decode(db.HEAPU8.slice(out, out + db._forgedb_reply_len()))
}

const session = chips.map((input) => ({ input, output: [exec(splitChip(input)).trimEnd()] }))

const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {}
manifest.forgedb = {
  sha: process.env.FORGEDB_SHA,
  commands: JSON.parse(process.env.FORGEDB_COMMANDS),
  brotliBytes: Number(process.env.FORGEDB_BROTLI),
  session,
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n")
console.log(`forgedb: ${manifest.forgedb.brotliBytes} bytes brotli, ${session.length} recorded commands`)
