import type { SimEvent } from "./types"

// Percentage of successful requests each backend served in the last windowMs.
export function rollingShare(events: SimEvent[], nowMs: number, windowMs: number): { A: number; B: number } {
  let a = 0
  let b = 0
  for (const event of events) {
    if (event.Outcome !== "ok" || event.AtMs < nowMs - windowMs) continue
    if (event.Backend === "A") a++
    else if (event.Backend === "B") b++
  }
  const total = a + b
  if (total === 0) return { A: 0, B: 0 }
  const shareA = Math.round((a / total) * 100)
  return { A: shareA, B: 100 - shareA }
}
