import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { beforeEach, describe, expect, it } from "vitest"

type RawModule = {
  _malloc(size: number): number
  _free(ptr: number): void
  _forgedb_exec(ptr: number, len: number): number
  _forgedb_reply_len(): number
  _forgedb_aof_drain(): number
  _forgedb_aof_len(): number
  HEAPU8: Uint8Array
}

const modulePath = resolve("public/wasm/forgedb.mjs")
const encoder = new TextEncoder()
const decoder = new TextDecoder()

function resp(...args: string[]): string {
  return `*${args.length}\r\n` + args.map((a) => `$${encoder.encode(a).length}\r\n${a}\r\n`).join("")
}

async function loadRaw() {
  expect(existsSync(modulePath), `${modulePath} is built`).toBe(true)
  const { default: factory } = await import(pathToFileURL(modulePath).href)
  const m: RawModule = await factory()
  const exec = (request: string) => {
    const bytes = encoder.encode(request)
    const ptr = m._malloc(bytes.length)
    m.HEAPU8.set(bytes, ptr)
    const out = m._forgedb_exec(ptr, bytes.length)
    m._free(ptr)
    return decoder.decode(m.HEAPU8.slice(out, out + m._forgedb_reply_len()))
  }
  const drainAof = () => {
    const out = m._forgedb_aof_drain()
    return decoder.decode(m.HEAPU8.slice(out, out + m._forgedb_aof_len()))
  }
  return { exec, drainAof }
}

describe("ForgeDB compiled to WebAssembly", () => {
  let db: Awaited<ReturnType<typeof loadRaw>>
  beforeEach(async () => {
    db = await loadRaw()
  })

  it("answers PING with PONG", () => {
    expect(db.exec(resp("PING"))).toBe("+PONG\r\n")
  })

  it("rounds TTL like Redis right after SET EX", () => {
    expect(db.exec(resp("SET", "k", "v", "EX", "30"))).toBe("+OK\r\n")
    expect(db.exec(resp("TTL", "k"))).toBe(":30\r\n")
  })

  it("names unknown commands", () => {
    expect(db.exec(resp("FOO"))).toBe("-unknown command 'FOO'\r\n")
  })

  it("logs writes to the append-only buffer and skips reads", () => {
    db.exec(resp("SET", "a", "1"))
    expect(db.drainAof()).toContain("*3\r\n$3\r\nSET\r\n")
    db.exec(resp("GET", "a"))
    expect(db.drainAof()).toBe("")
  })

  it("caps the demo at 1000 keys", () => {
    for (let i = 0; i < 1000; i++) expect(db.exec(resp("SET", `key${i}`, "v"))).toBe("+OK\r\n")
    expect(db.exec(resp("SET", "one-too-many", "v"))).toBe(
      "-ERR demo limit reached: 1000 keys. Reload the page to start over.\r\n",
    )
    expect(db.exec(resp("SET", "key0", "overwrite"))).toBe("+OK\r\n")
  })

  it("explains that Pub/Sub is off in the browser", () => {
    expect(db.exec(resp("PUBLISH", "c", "m"))).toBe(
      "-Pub/Sub needs a second client connection, so it is off in the browser\r\n",
    )
  })

  it("rejects malformed RESP and empty arrays", () => {
    expect(db.exec("*1\r\n$4\r\nPI")).toBe("-ERR Protocol error\r\n")
    expect(db.exec("*0\r\n")).toBe("-ERR Protocol error\r\n")
  })
})

describe("ForgeSession against the real module", () => {
  it("round-trips unicode values through real ForgeDB", async () => {
    const { loadForgeModule } = await import("@/lib/forgedb/loader")
    const { ForgeSession } = await import("@/lib/forgedb/session")
    const session = new ForgeSession(() => loadForgeModule(pathToFileURL(modulePath).href), [])
    expect(await session.run('SET k "héllo 👋"')).toEqual({ lines: ["OK"] })
    expect(await session.run("GET k")).toEqual({ lines: ['"héllo 👋"'] })
    session.dispose()
  })
})
