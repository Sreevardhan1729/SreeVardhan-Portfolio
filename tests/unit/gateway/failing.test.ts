import { describe, expect, it, vi } from "vitest"
import { createFailingStore } from "@/lib/gateway/failing"

describe("failing store", () => {
  it("starts with both backends healthy", () => {
    expect(createFailingStore().get()).toEqual({ A: false, B: false })
  })

  it("marks one backend failing and tells subscribers", () => {
    const store = createFailingStore()
    const listener = vi.fn()
    store.subscribe(listener)
    store.set("A", true)
    expect(store.get()).toEqual({ A: true, B: false })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it("keeps the same snapshot and stays quiet when nothing changes", () => {
    const store = createFailingStore()
    const listener = vi.fn()
    store.subscribe(listener)
    const before = store.get()
    store.set("B", false)
    expect(store.get()).toBe(before)
    expect(listener).not.toHaveBeenCalled()
  })

  it("stops telling a listener once it unsubscribes", () => {
    const store = createFailingStore()
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    unsubscribe()
    store.set("A", true)
    expect(listener).not.toHaveBeenCalled()
  })
})
