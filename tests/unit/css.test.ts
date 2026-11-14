import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("globals.css", () => {
  it("never defines a custom property in terms of itself", () => {
    const css = readFileSync("app/globals.css", "utf8")
    // e.g. `--font-mono: var(--font-mono), monospace` is circular, so the browser drops it and fonts fall back.
    const circular = [...css.matchAll(/(--[\w-]+)\s*:\s*[^;]*var\(\s*\1\s*[,)]/g)].map((match) => match[1])
    expect(circular).toEqual([])
  })
})
