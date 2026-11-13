import { describe, expect, it } from "vitest"
import { rollingShare } from "@/lib/gateway/share"
import type { SimEvent } from "@/lib/gateway/types"

const event = (backend: "A" | "B" | "", outcome: SimEvent["Outcome"], at: number): SimEvent => ({
  ID: at,
  Backend: backend,
  Outcome: outcome,
  Priority: 1,
  AtMs: at,
})

describe("rollingShare", () => {
  it("splits successful requests in the window by backend", () => {
    const events = [event("A", "ok", 9_000), event("B", "ok", 9_100), event("B", "ok", 9_200), event("B", "ok", 9_300)]
    expect(rollingShare(events, 10_000, 10_000)).toEqual({ A: 25, B: 75 })
  })

  it("ignores events older than the window and anything that did not succeed", () => {
    const events = [
      event("A", "ok", 1_000),
      event("B", "failed", 15_000),
      event("", "rate_limited", 15_500),
      event("", "shed", 15_600),
      event("B", "ok", 16_000),
    ]
    expect(rollingShare(events, 20_000, 10_000)).toEqual({ A: 0, B: 100 })
  })

  it("reports zero for both when nothing succeeded", () => {
    expect(rollingShare([], 1_000, 10_000)).toEqual({ A: 0, B: 0 })
  })
})
