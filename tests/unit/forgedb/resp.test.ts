import { describe, expect, it } from "vitest"
import { decodeReply, decodeStream, encodeCommand } from "@/lib/forgedb/resp"

const bytes = (text: string) => new TextEncoder().encode(text)
const text = (data: Uint8Array) => new TextDecoder().decode(data)

describe("RESP codec", () => {
  it("encodes a command as an array of bulk strings with UTF-8 byte lengths", () => {
    expect(text(encodeCommand(["SET", "k", "é"]))).toBe("*3\r\n$3\r\nSET\r\n$1\r\nk\r\n$2\r\né\r\n")
  })

  it("decodes every reply type", () => {
    expect(decodeReply(bytes("+OK\r\n"))).toEqual({ type: "simple", value: "OK" })
    expect(decodeReply(bytes("-ERR nope\r\n"))).toEqual({ type: "error", value: "ERR nope" })
    expect(decodeReply(bytes(":-2\r\n"))).toEqual({ type: "integer", value: -2 })
    expect(decodeReply(bytes("$-1\r\n"))).toEqual({ type: "bulk", value: null })
    expect(decodeReply(bytes("$7\r\nhé\r\nlo\r\n"))).toEqual({ type: "bulk", value: "hé\r\nlo" })
    expect(decodeReply(bytes("*-1\r\n"))).toEqual({ type: "array", items: null })
    expect(decodeReply(bytes("*2\r\n$1\r\na\r\n*1\r\n:1\r\n"))).toEqual({
      type: "array",
      items: [{ type: "bulk", value: "a" }, { type: "array", items: [{ type: "integer", value: 1 }] }],
    })
  })

  it("decodes a stream of back-to-back values", () => {
    expect(decodeStream(bytes("*1\r\n$4\r\nPING\r\n*2\r\n$3\r\nDEL\r\n$1\r\nk\r\n"))).toEqual([
      { type: "array", items: [{ type: "bulk", value: "PING" }] },
      { type: "array", items: [{ type: "bulk", value: "DEL" }, { type: "bulk", value: "k" }] },
    ])
    expect(decodeStream(new Uint8Array())).toEqual([])
  })
})
