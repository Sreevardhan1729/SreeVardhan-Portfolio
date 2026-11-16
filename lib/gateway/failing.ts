import { useSyncExternalStore } from "react"
import type { BackendName } from "./types"

export type Failing = Record<BackendName, boolean>

const HEALTHY: Failing = { A: false, B: false }

// Which backends the visitor has set failing. The window's switches and the hero's gateway step both read and write it,
// so either one always shows what the other did.
export function createFailingStore() {
  let state = HEALTHY
  const listeners = new Set<() => void>()
  return {
    get: () => state,
    set(backend: BackendName, failing: boolean) {
      if (state[backend] === failing) return
      state = { ...state, [backend]: failing }
      for (const listener of listeners) listener()
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export const failingStore = createFailingStore()

export const useFailing = (): Failing =>
  useSyncExternalStore(failingStore.subscribe, failingStore.get, () => HEALTHY)
