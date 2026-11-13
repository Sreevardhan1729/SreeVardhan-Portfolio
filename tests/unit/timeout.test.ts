import { afterEach, describe, expect, it, vi } from "vitest"
import { withTimeout } from "@/lib/timeout"

describe("withTimeout", () => {
  afterEach(() => vi.useRealTimers())

  it("passes a value through when it arrives in time", async () => {
    await expect(withTimeout(Promise.resolve(42), 1000, "slow")).resolves.toBe(42)
  })

  it("rejects once the time runs out", async () => {
    vi.useFakeTimers()
    const result = withTimeout(new Promise(() => {}), 1000, "module load timed out")
    const assertion = expect(result).rejects.toThrow("module load timed out")
    await vi.advanceTimersByTimeAsync(1000)
    await assertion
  })
})
