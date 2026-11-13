import { describe, expect, it, vi } from "vitest"
import type { ForgeModule } from "@/lib/forgedb/loader"
import { ForgeSession } from "@/lib/forgedb/session"

const encoder = new TextEncoder()
const decoder = new TextDecoder()

// Answers like ForgeDB for the few commands these tests send.
function fakeModule(options: { throwOnce?: boolean } = {}): ForgeModule {
  let throwNext = options.throwOnce ?? false
  let aof = ""
  return {
    exec(request) {
      if (throwNext) {
        throwNext = false
        throw new Error("RuntimeError: unreachable")
      }
      const raw = decoder.decode(request)
      if (raw.includes("PING")) return encoder.encode("+PONG\r\n")
      if (raw.includes("SET")) {
        aof += raw
        return encoder.encode("+OK\r\n")
      }
      return encoder.encode("-unknown command\r\n")
    },
    sweep() {},
    drainAof() {
      const out = encoder.encode(aof)
      aof = ""
      return out
    },
  }
}

describe("ForgeSession", () => {
  it("runs commands sent before the module loads, in order", async () => {
    let release: (m: ForgeModule) => void = () => {}
    const loading = new Promise<ForgeModule>((resolve) => (release = resolve))
    const session = new ForgeSession(() => loading, ["PING"])
    const first = session.run("PING")
    const second = session.run('SET a "b c"')
    release(fakeModule())
    expect(await first).toEqual({ lines: ["PONG"] })
    expect(await second).toEqual({ lines: ["OK"] })
    session.dispose()
  })

  it("reports status changes from loading to ready", async () => {
    const session = new ForgeSession(async () => fakeModule(), [])
    const seen: string[] = []
    session.onStatus((status) => seen.push(status))
    await session.start()
    expect(seen).toEqual(["loading", "ready"])
    session.dispose()
  })

  it("becomes unavailable when the module cannot load", async () => {
    const session = new ForgeSession(async () => Promise.reject(new Error("blocked")), [])
    expect(await session.run("PING")).toEqual({ lines: ["(error) live demo unavailable"] })
    session.dispose()
  })

  it("restarts with fresh data after the module crashes", async () => {
    const load = vi.fn(async () => fakeModule({ throwOnce: true }))
    load.mockImplementationOnce(async () => fakeModule({ throwOnce: true }))
    load.mockImplementationOnce(async () => fakeModule())
    const session = new ForgeSession(load, [])
    expect(await session.run("PING")).toEqual({ lines: ["(error) ForgeDB crashed and restarted, so its data was reset"] })
    expect(await session.run("PING")).toEqual({ lines: ["PONG"] })
    expect(load).toHaveBeenCalledTimes(2)
    session.dispose()
  })

  it("becomes unavailable when the restart after a crash fails", async () => {
    const load = vi.fn(async () => Promise.reject<ForgeModule>(new Error("offline")))
    load.mockImplementationOnce(async () => fakeModule({ throwOnce: true }))
    const session = new ForgeSession(load, [])
    expect(await session.run("PING")).toEqual({ lines: ["(error) ForgeDB crashed and restarted, so its data was reset"] })
    expect(await session.run("PING")).toEqual({ lines: ["(error) live demo unavailable"] })
    session.dispose()
  })

  it("rejects lines over 1024 bytes before they reach ForgeDB", async () => {
    const session = new ForgeSession(async () => fakeModule(), [])
    expect(await session.run(`SET k ${"é".repeat(520)}`)).toEqual({
      lines: ["(error) ERR line too long (max 1024 bytes)"],
    })
    session.dispose()
  })

  it("ignores blank lines and reports tokenizer errors like redis-cli", async () => {
    const session = new ForgeSession(async () => fakeModule(), [])
    expect(await session.run("   ")).toEqual({ lines: [] })
    expect(await session.run('SET k "x')).toEqual({ lines: ["Invalid argument(s)"] })
    session.dispose()
  })

  it("handles HELP and CLEAR locally", async () => {
    const session = new ForgeSession(async () => fakeModule(), ["PING", "GET", "PUBLISH"])
    const help = await session.run("help")
    expect(help.lines[0]).toBe("ForgeDB commands in this build:")
    expect(help.lines).toContain("1) PING")
    expect(help.lines).toContain("2) GET")
    expect(help.lines.join("\n")).not.toContain(") PUBLISH")
    expect(await session.run("CLEAR")).toEqual({ lines: [], clear: true })
    session.dispose()
  })

  it("reports append-only log entries as command lines", async () => {
    const session = new ForgeSession(async () => fakeModule(), [])
    const entries: string[][] = []
    session.onAof((batch) => entries.push(batch))
    await session.run('SET a "b c"')
    await session.run("PING")
    expect(entries).toEqual([['SET a "b c"']])
    session.dispose()
  })
})
