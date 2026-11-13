import { describe, expect, it } from "vitest"
import { formatReply } from "@/lib/forgedb/format"

describe("formatReply (redis-cli output)", () => {
  it("prints scalar replies the way redis-cli does", () => {
    expect(formatReply({ type: "simple", value: "OK" })).toEqual(["OK"])
    expect(formatReply({ type: "error", value: "ERR x" })).toEqual(["(error) ERR x"])
    expect(formatReply({ type: "integer", value: 60 })).toEqual(["(integer) 60"])
    expect(formatReply({ type: "bulk", value: null })).toEqual(["(nil)"])
    expect(formatReply({ type: "array", items: null })).toEqual(["(nil)"])
  })

  it("quotes bulk strings and escapes control characters but keeps UTF-8 text", () => {
    expect(formatReply({ type: "bulk", value: 'a\nb\t"c"\\é👋' })).toEqual(['"a\\nb\\t\\"c\\"\\\\é👋"'])
    expect(formatReply({ type: "bulk", value: "\u0001" })).toEqual(['"\\x01"'])
  })

  it("numbers array items and indents nested arrays", () => {
    expect(formatReply({ type: "array", items: [] })).toEqual(["(empty array)"])
    expect(
      formatReply({
        type: "array",
        items: [
          { type: "array", items: [{ type: "bulk", value: "a" }, { type: "bulk", value: "b" }] },
          { type: "bulk", value: "c" },
        ],
      }),
    ).toEqual(['1) 1) "a"', '   2) "b"', '2) "c"'])
  })

  it("right-aligns indexes when there are ten or more items", () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ type: "integer" as const, value: i }))
    const lines = formatReply({ type: "array", items })
    expect(lines[0]).toBe(" 1) (integer) 0")
    expect(lines[9]).toBe("10) (integer) 9")
  })
})
