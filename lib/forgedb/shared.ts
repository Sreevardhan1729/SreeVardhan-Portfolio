import manifest from "@/public/wasm/manifest.json"
import { loadForgeModule } from "./loader"
import { ForgeSession } from "./session"

let session: ForgeSession | undefined

// The hero terminal and the append-only log panel share one ForgeDB instance.
export function getForgeSession(): ForgeSession {
  session ??= new ForgeSession(() => loadForgeModule(), manifest.forgedb.commands)
  return session
}
