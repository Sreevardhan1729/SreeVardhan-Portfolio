import { describe, expect, it } from "vitest"
import { capturedKey } from "@/lib/forgedb/type-anywhere"

const key = (value: string, extra: Partial<Parameters<typeof capturedKey>[0]> = {}) => ({
  key: value,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  isComposing: false,
  defaultPrevented: false,
  ...extra,
})

describe("capturedKey", () => {
  it("takes printable characters when nothing on the page has focus", () => {
    expect(capturedKey(key("g"), true)).toBe("g")
    expect(capturedKey(key("P"), true)).toBe("P")
    expect(capturedKey(key('"'), true)).toBe('"')
  })

  it("leaves keys alone while something else has focus", () => {
    expect(capturedKey(key("g"), false)).toBeNull()
  })

  it("leaves shortcuts, named keys and space to the browser", () => {
    expect(capturedKey(key("k", { metaKey: true }), true)).toBeNull()
    expect(capturedKey(key("k", { ctrlKey: true }), true)).toBeNull()
    expect(capturedKey(key("k", { altKey: true }), true)).toBeNull()
    expect(capturedKey(key("Enter"), true)).toBeNull()
    expect(capturedKey(key("ArrowDown"), true)).toBeNull()
    expect(capturedKey(key(" "), true)).toBeNull()
  })

  it("ignores composition and keys another handler already took", () => {
    expect(capturedKey(key("g", { isComposing: true }), true)).toBeNull()
    expect(capturedKey(key("g", { defaultPrevented: true }), true)).toBeNull()
  })
})
