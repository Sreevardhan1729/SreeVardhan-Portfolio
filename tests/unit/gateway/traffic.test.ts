import { describe, expect, it } from "vitest"
import { arrivalsFor, burst, MIX_WEIGHTS } from "@/lib/gateway/traffic"

// Small deterministic generator so proportions are repeatable.
function seeded(seed: number) {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe("traffic generator", () => {
  it("clamps long gaps to one second of arrivals", () => {
    expect(arrivalsFor(600_000, 10, "default", seeded(1)).length).toBeLessThanOrEqual(10)
  })

  it("produces the requested rate on average", () => {
    const rng = seeded(2)
    let total = 0
    // 6,000 frames of 16 ms at 10 req/s should give about 960 arrivals (±3 standard deviations).
    for (let frame = 0; frame < 6000; frame++) total += arrivalsFor(16, 10, "default", rng).length
    expect(total).toBeGreaterThan(870)
    expect(total).toBeLessThan(1050)
  })

  it.each(["default", "premium", "batch-heavy"] as const)("matches the %s mix within 3%%", (mix) => {
    const rng = seeded(3)
    const counts = [0, 0, 0]
    let total = 0
    while (total < 10_000) {
      for (const arrival of arrivalsFor(1000, 100, mix, rng)) {
        counts[arrival.priority]++
        total++
      }
    }
    counts.forEach((count, priority) => expect(Math.abs(count / total - MIX_WEIGHTS[mix][priority])).toBeLessThan(0.03))
  })

  it("spreads ordinary traffic over eight API keys at one token each", () => {
    const arrivals = arrivalsFor(1000, 400, "default", seeded(4))
    expect(new Set(arrivals.map((a) => a.key)).size).toBe(8)
    expect(arrivals.every((a) => a.cost === 1)).toBe(true)
  })

  it("bursts twenty expensive requests from one key", () => {
    expect(burst()).toEqual(Array.from({ length: 20 }, () => ({ key: "burst-key", priority: 1, cost: 100 })))
  })
})
