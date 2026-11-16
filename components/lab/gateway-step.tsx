"use client"

import { secondaryButton } from "@/components/site/buttons"
import { burstOneKey, failBackend } from "@/lib/events"
import { failingStore, useFailing } from "@/lib/gateway/failing"

// While A fails, its button is tinted and pulses, and its label names the next action rather than the state.
const failingButton =
  "inline-flex items-center gap-2 rounded-md border border-err/50 bg-err/10 px-3.5 py-2 text-sm font-medium transition-colors hover:border-err"

// The second step of the hero's scroll story: as it reaches the middle of the screen, the pinned window switches to
// the gateway. Phones skip it and show the gateway under the terminal.
export function GatewayStep() {
  const { A: failing } = useFailing()
  return (
    <div
      data-lab-step="gateway"
      className="hidden story:flex story:min-h-[85svh] story:flex-col story:justify-center"
    >
      <p className="font-mono text-[11px] text-accent">Now in the window · Go → WebAssembly</p>
      <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight">My LLM gateway, under live traffic</h2>
      <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted">
        Each dot is a request. It spends tokens from its API key&apos;s bucket, waits in a bounded priority queue, and a
        smooth weighted round-robin balancer sends it to backend A or B, each behind its own circuit breaker.
      </p>
      <p className="mt-7 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Break it</p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => (failing ? failingStore.set("A", false) : failBackend("A"))}
          className={failing ? failingButton : secondaryButton}
        >
          {failing && <span aria-hidden="true" className="live-dot size-1.5 rounded-full bg-err" />}
          {failing ? "Recover backend A" : "Fail backend A"}
        </button>
        <button type="button" onClick={burstOneKey} className={secondaryButton}>
          Burst one key
        </button>
      </div>
      <p role="status" className="sr-only">
        {failing ? "Backend A is failing." : "Backend A is healthy."}
      </p>
      <p className="mt-4 max-w-md text-[13px] leading-relaxed text-muted">
        A failing backend opens its breaker after five failures, and the balancer sends everything to the other one.
        Recover it and the breaker closes again after its cooldown, about 30 seconds. A burst from one key empties its
        bucket, and the limiter answers with 429s.
      </p>
    </div>
  )
}
