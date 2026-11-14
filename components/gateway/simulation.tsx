"use client"

import { Pause, Play } from "lucide-react"
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react"
import { GATEWAY_FAIL_EVENT, type GatewayFailDetail } from "@/lib/events"
import { loadGatewaySim } from "@/lib/gateway/loader"
import { withTimeout } from "@/lib/timeout"
import { rollingShare } from "@/lib/gateway/share"
import { arrivalsFor, burst, type Mix } from "@/lib/gateway/traffic"
import type { BackendName, BreakerState, GatewaySim, SimConfig, SimEvent, SimSnapshot } from "@/lib/gateway/types"
import manifest from "@/public/wasm/manifest.json"
import { type FlowMetrics, PipelineCanvas } from "./pipeline-canvas"
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
  ready: `live · ai-inference-gateway@${manifest.gateway.sha.slice(0, 7)} · ${manifest.gateway.toolchain.split(" ")[0]}`,
  unavailable: "unavailable · showing the request path",
}
const STATUS_DOT: Record<Status, string> = {
  idle: "bg-p-dim",
  loading: "bg-p-accent live-dot",
  ready: "bg-p-ok live-dot",
  unavailable: "bg-p-err",
}
const BREAKER_DOT: Record<BreakerState, string> = { closed: "bg-p-ok", open: "bg-p-err", "half-open": "bg-p-accent" }

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
  const metrics = useMemo<FlowMetrics>(
    () => ({
      rate: playing ? rate : 0,
      rateLimited: view.rateLimited,
      queue: view.queue,
      capacity: CONFIG.QueueCapacity,
      share: view.share,
      states: { A: view.backends.A.state, B: view.backends.B.state },
    }),
    [playing, rate, view],
  )
  const totalShed = view.shed[0] + view.shed[1] + view.shed[2]

  return (
    <div id="gateway-sim" ref={rootRef} data-status={status} className="panel overflow-hidden">
      <div className="flex items-center gap-3 border-b border-p-rule bg-p-bg-2 px-4 py-2.5">
        <span aria-hidden="true" className="panel-dots">
          <span />
          <span />
          <span />
        </span>
        <span className="truncate font-mono text-[11.5px] text-p-muted">gateway — live simulation</span>
        <span className="ml-auto flex min-w-0 items-center gap-1.5 rounded-full border border-p-rule bg-p-bg px-2.5 py-0.5 font-mono text-[10.5px] text-p-muted">
          <span aria-hidden="true" className={`inline-block size-1.5 shrink-0 rounded-full ${STATUS_DOT[status]}`} />
          <span className="truncate">{STATUS_TEXT[status]}</span>
        </span>
      </div>

      <div className="h-64 border-b border-p-rule">
        {ready ? <PipelineCanvas pending={pending} metrics={metrics} animate={!reducedMotion} /> : <StaticPipeline />}
      </div>

      <div className="grid grid-cols-2 gap-px border-b border-p-rule bg-p-rule lg:grid-cols-4">
        <div data-testid="share" className="bg-p-bg p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-p-muted">Share · last 10 s</p>
          <p className="mt-2 font-mono text-lg leading-none">
            <span className="text-p-a">A {view.share.A}%</span> <span className="text-p-dim">/</span>{" "}
            <span className="text-p-b">B {view.share.B}%</span>
          </p>
          <div aria-hidden="true" className="mt-2.5 flex h-1.5 overflow-hidden rounded-full bg-p-rule">
            <span className="bg-p-a transition-[width] duration-300" style={{ width: `${view.share.A}%` }} />
            <span className="bg-p-b transition-[width] duration-300" style={{ width: `${view.share.B}%` }} />
          </div>
          <p data-testid="served" className="mt-2 font-mono text-[10.5px] text-p-muted">
            Served A {view.backends.A.served} · B {view.backends.B.served}
          </p>
        </div>

        <div className="bg-p-bg p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-p-muted">Circuit breakers</p>
          <div className="mt-2 space-y-1.5">
            {BACKENDS.map((backend) => (
              <p key={backend} data-testid={`breaker-${backend}`} className="flex items-center gap-2 font-mono text-[12px]">
                <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${BREAKER_DOT[view.backends[backend].state]}`} />
                {breakerText(backend, view.backends[backend])}
              </p>
            ))}
          </div>
        </div>

        <div data-testid="rate-limited" className="bg-p-bg p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-p-muted">Rate limited</p>
          <p className={`mt-2 font-mono text-2xl leading-none ${view.rateLimited > 0 ? "text-p-err" : "text-p-fg"}`}>
            {view.rateLimited}
          </p>
          <p className="mt-1.5 font-mono text-[10.5px] text-p-muted">429 responses</p>
        </div>

        <div className="bg-p-bg p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-p-muted">Queue</p>
          <p className="mt-2 font-mono text-2xl leading-none">
            {view.queue}
            <span className="text-sm text-p-muted"> / {CONFIG.QueueCapacity}</span>
          </p>
          <div aria-hidden="true" className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-p-rule">
            <span
              className="block h-full bg-p-accent transition-[width] duration-200"
              style={{ width: `${Math.min(100, (view.queue / CONFIG.QueueCapacity) * 100)}%` }}
            />
          </div>
          <p className="mt-2 font-mono text-[10.5px] text-p-muted">shed {totalShed}</p>
          <p className="font-mono text-[10px] text-p-dim">
            premium {view.shed[0]} · default {view.shed[1]} · batch {view.shed[2]}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 bg-p-bg-2 px-4 py-3">
        <button type="button" disabled={!ready} onClick={() => setPlaying((value) => !value)} className="pbtn">
          {playing ? <Pause aria-hidden="true" className="size-3.5" /> : <Play aria-hidden="true" className="size-3.5" />}
          {playing ? "Pause" : "Play"}
        </button>
        <label className="flex items-center gap-2 text-[12.5px] text-p-muted">
          Traffic
          <input
            type="range"
            min={1}
            max={40}
            value={rate}
            disabled={!ready}
            onChange={(event) => setRate(Number(event.target.value))}
            className="w-24 accent-[var(--p-accent)]"
          />
          <output className="w-16 whitespace-nowrap font-mono text-[12px] text-p-fg">{rate} req/s</output>
        </label>
        <span aria-hidden="true" className="hidden h-5 w-px bg-p-rule sm:block" />
        {BACKENDS.map((backend) => (
          <button
            key={backend}
            type="button"
            role="switch"
            aria-checked={failing[backend]}
            disabled={!ready}
            onClick={() => setFailing((current) => ({ ...current, [backend]: !current[backend] }))}
            className="pbtn"
          >
            <span
              aria-hidden="true"
              className={`relative inline-block h-3.5 w-6 rounded-full transition-colors ${failing[backend] ? "bg-p-err" : "bg-p-rule"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 size-2.5 rounded-full bg-p-fg transition-transform ${failing[backend] ? "translate-x-2.5" : "translate-x-0"}`}
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
          className="pbtn"
        >
          Burst from one API key
        </button>
        <button type="button" disabled={!ready || !anyOpen} onClick={() => sim?.skipCooldown()} className="pbtn">
          Skip cooldown
        </button>
        <fieldset className="flex flex-wrap items-center gap-2" disabled={!ready}>
          <legend className="float-left mr-1 text-[12.5px] text-p-muted">Traffic mix</legend>
          <span className="flex rounded-lg border border-p-rule bg-p-bg p-0.5">
            {MIXES.map((option) => (
              <label
                key={option.value}
                className="cursor-pointer whitespace-nowrap rounded-md px-2 py-1 text-[12px] text-p-muted transition-colors has-[:checked]:bg-p-bg-3 has-[:checked]:text-p-fg has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-p-accent"
              >
                <input
                  type="radio"
                  name="traffic-mix"
                  value={option.value}
                  checked={mix === option.value}
                  onChange={() => setMix(option.value)}
                  className="sr-only"
                />
                {option.label}
              </label>
            ))}
          </span>
        </fieldset>
      </div>

      <p className="border-t border-p-rule px-4 py-2.5 text-[11.5px] leading-relaxed text-p-muted">
        Demo settings: queue {CONFIG.QueueCapacity} jobs, {CONFIG.Workers} workers (the real gateway runs 1,000 and 50).
        Breakers open after 5 failures and half-open after 30 s, on the next 10 s health check.
      </p>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  )
}
