import type { Priority } from "./types"

export type Mix = "default" | "premium" | "batch-heavy"
export type Arrival = { key: string; priority: Priority; cost: number }

// Share of premium, default and batch requests in each traffic mix.
export const MIX_WEIGHTS: Record<Mix, [number, number, number]> = {
  default: [0.05, 0.85, 0.1],
  premium: [0.3, 0.6, 0.1],
  "batch-heavy": [0.05, 0.35, 0.6],
}

const KEYS = 8
const MAX_GAP_MS = 1000 // a hidden tab or a slow frame never releases more than a second of traffic

function pickPriority(mix: Mix, roll: number): Priority {
  const [premium, standard] = MIX_WEIGHTS[mix]
  if (roll < premium) return 0
  if (roll < premium + standard) return 1
  return 2
}

export function arrivalsFor(dtMs: number, ratePerSec: number, mix: Mix, rng: () => number): Arrival[] {
  const expected = (ratePerSec * Math.min(Math.max(dtMs, 0), MAX_GAP_MS)) / 1000
  const count = Math.floor(expected) + (rng() < expected - Math.floor(expected) ? 1 : 0)
  return Array.from({ length: count }, () => ({
    key: `key-${1 + Math.floor(rng() * KEYS)}`,
    priority: pickPriority(mix, rng()),
    cost: 1,
  }))
}

// Twenty requests at 100 tokens each from one key: the gateway's 1,000-token bucket runs dry halfway through.
export const BURST_SIZE = 20

export function burst(): Arrival[] {
  return Array.from({ length: BURST_SIZE }, () => ({ key: "burst-key", priority: 1, cost: 100 }))
}
