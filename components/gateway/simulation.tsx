"use client"

import { useEffect, useEffectEvent, useRef, useState } from "react"
import { GATEWAY_FAIL_EVENT, type GatewayFailDetail } from "@/lib/events"
import { loadGatewaySim } from "@/lib/gateway/loader"
import { withTimeout } from "@/lib/timeout"
import { rollingShare } from "@/lib/gateway/share"
import { arrivalsFor, burst, type Mix } from "@/lib/gateway/traffic"
import type { BackendName, BreakerState, GatewaySim, SimConfig, SimEvent, SimSnapshot } from "@/lib/gateway/types"
import manifest from "@/public/wasm/manifest.json"
import { PipelineCanvas } from "./pipeline-canvas"
import { StaticPipeline } from "./static-pipeline"

// Demo scale: small enough to overload at a few requests per second. The breaker timings are the gateway's own.
const CONFIG: SimConfig = { QueueCapacity: 20, Workers: 4, LatencyMs: 150, CooldownMs: 30_000, HealthCheckMs: 10_000 }
const SHARE_WINDOW_MS = 10_000
const SNAPSHOT_EVERY_MS = 100
const LOAD_TIMEOUT_MS = 15_000 // past this, keep the static request path instead of waiting
const BACKENDS: BackendName[] = ["A", "B"]
const MIXES: { value: Mix; label: string }[] = [
  { value: "default", label: "Mostly default" },
  { value: "premium", label: "With premium" },
  { value: "batch-heavy", label: "Heavy batch" },
]

type Status = "idle" | "loading" | "ready" | "unavailable"
type BackendView = { state: BreakerState; promoteInS: number; served: number }
type View = {
  share: { A: number; B: number }
  backends: Record<BackendName, BackendView>
  rateLimited: number
  shed: [number, number, number]
  queue: number
}

const EMPTY_VIEW: View = {
  share: { A: 0, B: 0 },
  backends: { A: { state: "closed", promoteInS: 0, served: 0 }, B: { state: "closed", promoteInS: 0, served: 0 } },
  rateLimited: 0,
  shed: [0, 0, 0],
  queue: 0,
}

const STATUS_TEXT: Record<Status, string> = {
  idle: "loads when you scroll here",
  loading: "loading…",
  ready: `running ai-inference-gateway@${manifest.gateway.sha.slice(0, 7)}, compiled with TinyGo`,
  unavailable: "live simulation unavailable, showing the request path",
}

const ANNOUNCE: Record<BreakerState, string> = { open: "opened", "half-open": "half-open", closed: "closed" }

function windowLoaded(): Promise<void> {
  if (document.readyState === "complete") return Promise.resolve()
  return new Promise((resolve) => window.addEventListener("load", () => resolve(), { once: true }))
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduced(query.matches)
    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])
  return reduced
}

function breakerText(name: BackendName, backend: BackendView): string {
  if (backend.state === "open") return `${name} · open · half-open in ${backend.promoteInS}s`
  return `${name} · ${backend.state}`
}

export function GatewaySimulation() {
  const rootRef = useRef<HTMLDivElement>(null)
  const startedRef = useRef(false)
  const pending = useRef<SimEvent[]>([])
  const recent = useRef<SimEvent[]>([])
  const lastStates = useRef<Record<BackendName, BreakerState>>({ A: "closed", B: "closed" })
  const [status, setStatus] = useState<Status>("idle")
  const [sim, setSim] = useState<GatewaySim | null>(null)
  const [near, setNear] = useState(false)
  const [onScreen, setOnScreen] = useState(false)
  const [playing, setPlaying] = useState(true)
  const [rate, setRate] = useState(10)
  const [mix, setMix] = useState<Mix>("default")
  const [failing, setFailing] = useState<Record<BackendName, boolean>>({ A: false, B: false })
  const [view, setView] = useState<View>(EMPTY_VIEW)
  const [announcement, setAnnouncement] = useState("")
  const reducedMotion = usePrefersReducedMotion()
  const currentSettings = useEffectEvent(() => ({ playing, rate, mix }))

  useEffect(() => {
    const root = rootRef.current!
    const nearby = new IntersectionObserver(([entry]) => entry.isIntersecting && setNear(true), { rootMargin: "100% 0px" })
    const visible = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting))
    nearby.observe(root)
    visible.observe(root)
    return () => {
      nearby.disconnect()
      visible.disconnect()
    }
  }, [])

  // Load once, after the page itself has loaded and only when the visitor is near the section.
  useEffect(() => {
    if (!near || startedRef.current) return
    startedRef.current = true
    setStatus("loading")
    windowLoaded()
      .then(() => withTimeout(loadGatewaySim(), LOAD_TIMEOUT_MS, "gateway simulation took too long to load"))
      .then((loaded) => {
        loaded.start(CONFIG)
        setSim(loaded)
        setStatus("ready")
      })
      .catch(() => setStatus("unavailable"))
  }, [near])

  useEffect(() => () => sim?.stop(), [sim])

  useEffect(() => {
    if (!sim) return
    for (const backend of BACKENDS) sim.setHealthy(backend, !failing[backend])
  }, [failing, sim])

  useEffect(() => {
    const onFail = (event: Event) => {
      const { backend } = (event as CustomEvent<GatewayFailDetail>).detail
      rootRef.current?.scrollIntoView({ block: "center" })
      setNear(true)
      setPlaying(true)
      setFailing((current) => ({ ...current, [backend]: true }))
    }
    window.addEventListener(GATEWAY_FAIL_EVENT, onFail)
    return () => window.removeEventListener(GATEWAY_FAIL_EVENT, onFail)
  }, [])

  // Traffic and readouts run only while the section is on screen and the tab is visible.
  useEffect(() => {
    if (!sim || !onScreen) return

    const apply = (snapshot: SimSnapshot) => {
      pending.current.push(...snapshot.Events)
      const cutoff = snapshot.NowMs - SHARE_WINDOW_MS
      recent.current = [...recent.current.filter((event) => event.AtMs >= cutoff), ...snapshot.Events.filter((e) => e.Outcome === "ok")]

      const backends = { ...EMPTY_VIEW.backends }
      for (const backend of snapshot.Backends) {
        backends[backend.Name] = {
          state: backend.State,
          served: backend.Served,
          promoteInS: backend.PromoteAtMs ? Math.max(0, Math.ceil((backend.PromoteAtMs - snapshot.NowMs) / 1000)) : 0,
        }
        if (lastStates.current[backend.Name] !== backend.State) {
          lastStates.current[backend.Name] = backend.State
          setAnnouncement(`Backend ${backend.Name} circuit ${ANNOUNCE[backend.State]}`)
        }
      }
      setView({
        share: rollingShare(recent.current, snapshot.NowMs, SHARE_WINDOW_MS),
        backends,
        rateLimited: snapshot.RateLimited,
        shed: snapshot.Shed,
        queue: snapshot.QueueDepth,
      })
    }

    let frame = 0
    let last = performance.now()
    let lastSnapshot = 0
    const tick = (now: number) => {
      const { playing, rate, mix } = currentSettings()
      if (playing) for (const arrival of arrivalsFor(now - last, rate, mix, Math.random)) sim.submit(arrival.key, arrival.priority, arrival.cost)
      if (now - lastSnapshot >= SNAPSHOT_EVERY_MS) {
        lastSnapshot = now
        apply(sim.snapshot())
      }
      last = now
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [sim, onScreen])

  const ready = status === "ready" && sim !== null
  const anyOpen = BACKENDS.some((backend) => view.backends[backend].state === "open")
  const states = { A: view.backends.A.state, B: view.backends.B.state }

  return (
    <div id="gateway-sim" ref={rootRef} data-status={status} className="overflow-hidden rounded-lg border border-rule bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-rule px-3.5 py-2 font-mono text-[11px] text-muted">
        <span className="text-foreground">gateway · live simulation</span>
        <span>{STATUS_TEXT[status]}</span>
      </div>

      <div className="h-60 border-b border-rule sm:h-48">
        {ready ? <PipelineCanvas pending={pending} states={states} animate={!reducedMotion} /> : <StaticPipeline />}
      </div>

      <div className="grid gap-x-6 gap-y-1.5 border-b border-rule px-3.5 py-3 font-mono text-[12px] sm:grid-cols-2">
        <p data-testid="share">
          Share (last 10 s): A {view.share.A}% · B {view.share.B}%
        </p>
        <p data-testid="served">
          Served: A {view.backends.A.served} · B {view.backends.B.served}
        </p>
        <p className="flex flex-wrap gap-2">
          {BACKENDS.map((backend) => {
            const state = view.backends[backend].state
            const tone = state === "closed" ? "border-ok text-ok" : state === "open" ? "border-err text-err" : "border-accent text-accent"
            return (
              <span key={backend} data-testid={`breaker-${backend}`} className={`rounded border px-1.5 ${tone}`}>
                {breakerText(backend, view.backends[backend])}
              </span>
            )
          })}
        </p>
        <p data-testid="rate-limited">429s: {view.rateLimited}</p>
        <p>
          Shed: premium {view.shed[0]} · default {view.shed[1]} · batch {view.shed[2]}
        </p>
        <p>
          Queue: {view.queue} / {CONFIG.QueueCapacity}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-3.5 py-3 text-[13px]">
        <button type="button" disabled={!ready} onClick={() => setPlaying((value) => !value)} className="control">
          {playing ? "Pause" : "Play"}
        </button>
        <label className="flex items-center gap-2">
          <span>Traffic</span>
          <input
            type="range"
            min={1}
            max={40}
            value={rate}
            disabled={!ready}
            onChange={(event) => setRate(Number(event.target.value))}
            className="w-28 accent-[var(--accent)]"
          />
          <output className="w-16 font-mono text-[12px] text-muted">{rate} req/s</output>
        </label>
        {BACKENDS.map((backend) => (
          <button
            key={backend}
            type="button"
            role="switch"
            aria-checked={failing[backend]}
            disabled={!ready}
            onClick={() => setFailing((current) => ({ ...current, [backend]: !current[backend] }))}
            className="control flex items-center gap-2"
          >
            <span
              aria-hidden="true"
              className={`relative inline-block h-3.5 w-6 rounded-full transition-colors ${failing[backend] ? "bg-err" : "bg-rule"}`}
            >
              <span
                className={`absolute top-0.5 size-2.5 rounded-full bg-surface transition-transform ${failing[backend] ? "translate-x-3" : "translate-x-0.5"}`}
              />
            </span>
            Backend {backend} failing
          </button>
        ))}
        <button
          type="button"
          disabled={!ready}
          onClick={() => {
            for (const arrival of burst()) sim?.submit(arrival.key, arrival.priority, arrival.cost)
          }}
          className="control"
        >
          Burst from one API key
        </button>
        <button type="button" disabled={!ready || !anyOpen} onClick={() => sim?.skipCooldown()} className="control">
          Skip cooldown
        </button>
        <fieldset className="flex flex-wrap items-center gap-x-3 gap-y-1" disabled={!ready}>
          <legend className="float-left mr-2">Traffic mix</legend>
          {MIXES.map((option) => (
            <label key={option.value} className="flex items-center gap-1.5">
              <input
                type="radio"
                name="traffic-mix"
                value={option.value}
                checked={mix === option.value}
                onChange={() => setMix(option.value)}
                className="accent-[var(--accent)]"
              />
              {option.label}
            </label>
          ))}
        </fieldset>
      </div>

      <p className="border-t border-rule px-3.5 py-2.5 text-[12px] text-muted">
        Demo settings: queue {CONFIG.QueueCapacity} jobs, {CONFIG.Workers} workers. The real gateway runs 1,000 and 50.
        Breakers open after 5 failures and half-open after 30 s, on the next 10 s health check.
      </p>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  )
}
