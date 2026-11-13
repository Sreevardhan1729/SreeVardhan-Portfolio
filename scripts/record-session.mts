// Runs the chip commands against the freshly built ForgeDB module and stores what the terminal
// prints, so the page's pre-load preview matches the live terminal. Also writes the forgedb
// manifest entry. Called by build-wasm.sh with FORGEDB_SHA, FORGEDB_COMMANDS and FORGEDB_BROTLI set.
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { loadForgeModule } from "../lib/forgedb/loader"
import { ForgeSession } from "../lib/forgedb/session"

const root = resolve(import.meta.dirname, "..")
const manifestPath = resolve(root, "public/wasm/manifest.json")
const chips: string[] = JSON.parse(readFileSync(resolve(root, "lib/forgedb/chips.json"), "utf8"))
const commands: string[] = JSON.parse(process.env.FORGEDB_COMMANDS ?? "[]")

const session = new ForgeSession(
  () => loadForgeModule(pathToFileURL(resolve(root, "public/wasm/forgedb.mjs")).href),
  commands,
)
const recorded: { input: string; output: string[] }[] = []
for (const input of chips) recorded.push({ input, output: (await session.run(input)).lines })
session.dispose()

const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {}
manifest.forgedb = {
  sha: process.env.FORGEDB_SHA,
  commands,
  brotliBytes: Number(process.env.FORGEDB_BROTLI),
  session: recorded,
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n")
console.log(`forgedb: ${manifest.forgedb.brotliBytes} bytes brotli, ${recorded.length} recorded commands`)
