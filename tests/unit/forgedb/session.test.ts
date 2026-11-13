import { afterEach, describe, expect, it, vi } from "vitest"
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

// A tiny key-value store that records the order commands reached it.
function keyValueModule(executed: string[]): ForgeModule {
  const store = new Map<string, string>()
  return {
    exec(request) {
      const args = [...decoder.decode(request).matchAll(/\$\d+\r\n([^\r]*)\r\n/g)].map((match) => match[1])
      executed.push(args.join(" "))
      if (args[0] === "SET") {
        store.set(args[1], args[2])
        return encoder.encode("+OK\r\n")
      }
      const value = store.get(args[1])
      return encoder.encode(value === undefined ? "$-1\r\n" : `$${value.length}\r\n${value}\r\n`)
    },
    sweep() {},
    drainAof: () => new Uint8Array(),
  }
}

describe("ForgeSession", () => {
  afterEach(() => vi.useRealTimers())

  it("runs commands sent before the module loads, in order", async () => {
    let release: (m: ForgeModule) => void = () => {}
    const loading = new Promise<ForgeModule>((resolve) => (release = resolve))
    const executed: string[] = []
    const session = new ForgeSession(() => loading, [])
    // Each GET depends on the SET before it, so any reordering changes the replies.
    const replies = ["SET a 1", "GET a", "SET a 2", "GET a"].map((line) => session.run(line))
    release(keyValueModule(executed))
    expect(await Promise.all(replies)).toEqual([{ lines: ["OK"] }, { lines: ['"1"'] }, { lines: ["OK"] }, { lines: ['"2"'] }])
    expect(executed).toEqual(["SET a 1", "GET a", "SET a 2", "GET a"])
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

  it("gives up and reports unavailable when loading stalls", async () => {
    vi.useFakeTimers()
    const session = new ForgeSession(() => new Promise<ForgeModule>(() => {}), [], 15_000)
    const seen: string[] = []
    session.onStatus((status) => seen.push(status))
    const reply = session.run("PING")
    await vi.advanceTimersByTimeAsync(15_000)
    expect(await reply).toEqual({ lines: ["(error) live demo unavailable"] })
    expect(seen).toEqual(["loading", "unavailable"])
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
