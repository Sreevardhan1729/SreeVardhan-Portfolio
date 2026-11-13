import { describe, expect, it } from "vitest"
import { tokenize } from "@/lib/forgedb/tokenize"

describe("tokenize (redis-cli rules)", () => {
  it("splits plain words on whitespace", () => {
    expect(tokenize("  SET  key   value ")).toEqual({ ok: true, args: ["SET", "key", "value"] })
  })

  it("reads double-quoted words with escapes", () => {
    expect(tokenize('SET k "hi there\\n\\t\\"x\\" \\\\ \\x41"')).toEqual({
      ok: true,
      args: ["SET", "k", 'hi there\n\t"x" \\ A'],
    })
  })

  it("reads single-quoted words literally except for an escaped quote", () => {
    expect(tokenize("SET k 'a\\nb \\'c\\''")).toEqual({ ok: true, args: ["SET", "k", "a\\nb 'c'"] })
  })

  it("keeps an empty quoted string as an argument", () => {
    expect(tokenize('SET k ""')).toEqual({ ok: true, args: ["SET", "k", ""] })
  })

  it("joins a quoted part onto the word it starts in", () => {
    expect(tokenize('SET k ab"c d"')).toEqual({ ok: true, args: ["SET", "k", "abc d"] })
  })

  it("rejects unbalanced quotes", () => {
    expect(tokenize('SET k "open')).toEqual({ ok: false, error: "Invalid argument(s)" })
    expect(tokenize("SET k 'open")).toEqual({ ok: false, error: "Invalid argument(s)" })
  })

  it("rejects a closing quote that is not followed by a space", () => {
    expect(tokenize('SET k "a"b')).toEqual({ ok: false, error: "Invalid argument(s)" })
  })

  it("returns no arguments for a blank line", () => {
    expect(tokenize("   ")).toEqual({ ok: true, args: [] })
  })
})
