"use client"

import { type RefObject, useEffect, useRef } from "react"
import type { BackendName, BreakerState, SimEvent } from "@/lib/gateway/types"

// What each stage shows under its name.
export type FlowMetrics = {
  rate: number
  rateLimited: number
  queue: number
  capacity: number
  share: Record<BackendName, number>
  states: Record<BackendName, BreakerState>
}

type Props = {
  pending: RefObject<SimEvent[]>
  metrics: FlowMetrics
  animate: boolean
}

type Dot = { start: number; event: SimEvent }
type Palette = Record<"fg" | "muted" | "dim" | "rule" | "bg2" | "bg3" | "accent" | "warn" | "ok" | "err" | "a" | "b" | "mono", string>

const MAX_DOTS = 70
const SEGMENT_MS = 300
const FADE_MS = 260
const STAGES = ["client", "limiter", "queue", "balancer"] as const
const STAGE_X = [0.0, 0.25, 0.5, 0.75]
const BACKEND_Y: Record<BackendName, number> = { A: 0.3, B: 0.7 }

// How many path segments a request travels before it stops: rejected at the limiter, shed at the queue, and so on.
const SEGMENTS: Record<SimEvent["Outcome"], number> = { rate_limited: 1, shed: 2, no_backend: 3, ok: 4, failed: 4 }

function readPalette(element: Element): Palette {
  const style = getComputedStyle(element)
  const v = (name: string) => style.getPropertyValue(name).trim()
  return {
    fg: v("--p-fg"),
    muted: v("--p-muted"),
    dim: v("--p-dim"),
    rule: v("--p-rule"),
    bg2: v("--p-bg-2"),
    bg3: v("--p-bg-3"),
    accent: v("--p-accent"),
    warn: v("--p-warn"),
    ok: v("--p-ok"),
    err: v("--p-err"),
    a: v("--p-a"),
    b: v("--p-b"),
    // Canvas fonts cannot use CSS variables, so resolve the monospace family next/font registered.
    mono: v("--font-mono") || "ui-monospace, monospace",
  }
}

export function PipelineCanvas({ pending, metrics, animate }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const metricsRef = useRef(metrics)
  const drawRef = useRef<(now: number) => void>(() => {})

  useEffect(() => {
    const wrap = wrapRef.current!
    const canvas = canvasRef.current!
    const ctx = canvas.getContext("2d")!
    let palette = readPalette(wrap)
    const dots: Dot[] = []
    let width = 0
    let height = 0
    let frame = 0

    const layout = () => {
      const narrow = width < 520
      // Wide enough for the labels, narrow enough that neighbouring stages never touch.
      const nodeW = Math.min(104, Math.max(58, Math.floor(width * 0.155)))
      const nodeH = narrow ? 40 : 46
      const left = nodeW / 2 + (narrow ? 10 : 20)
      const right = width - nodeW / 2 - (narrow ? 10 : 20)
      const span = right - left
      // Four stages share the first 80% of the width; the backends sit at the right edge.
      const stageX = STAGE_X.map((fraction) => left + fraction * span * 0.96)
      return { narrow, nodeW, nodeH, stageX, backendX: right }
    }

    const position = (segment: number, backend: BackendName | "", geo: ReturnType<typeof layout>) => {
      if (segment < STAGES.length) return { x: geo.stageX[segment], y: height / 2 }
      return { x: geo.backendX, y: BACKEND_Y[backend || "A"] * height }
    }

    // A point along the curve from the balancer to a backend.
    const curve = (t: number, backend: BackendName, geo: ReturnType<typeof layout>) => {
      const x0 = geo.stageX[3]
      const y0 = height / 2
      const x1 = geo.backendX
      const y1 = BACKEND_Y[backend] * height
      const cx = (x0 + x1) / 2
      const u = 1 - t
      return {
        x: u * u * u * x0 + 3 * u * u * t * cx + 3 * u * t * t * cx + t * t * t * x1,
        y: u * u * u * y0 + 3 * u * u * t * y0 + 3 * u * t * t * y1 + t * t * t * y1,
      }
    }

    const card = (cx: number, cy: number, geo: ReturnType<typeof layout>, label: string, detail: string, stroke: string, detailColor = palette.muted) => {
      const { nodeW, nodeH, narrow } = geo
      ctx.fillStyle = palette.bg3
      ctx.strokeStyle = stroke
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(cx - nodeW / 2, cy - nodeH / 2, nodeW, nodeH, 8)
      ctx.fill()
      ctx.stroke()
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillStyle = palette.fg
      ctx.font = `500 ${narrow ? 9.5 : 11.5}px ${palette.mono}`
      ctx.fillText(label, cx, cy - (narrow ? 6 : 7))
      ctx.fillStyle = detailColor
      ctx.font = `${narrow ? 8.5 : 10}px ${palette.mono}`
      ctx.fillText(detail, cx, cy + (narrow ? 8 : 9))
    }

    const draw = (now: number) => {
      const geo = layout()
      const m = metricsRef.current
      ctx.clearRect(0, 0, width, height)

      // Faint dot grid.
      ctx.fillStyle = palette.rule
      for (let gx = 12; gx < width; gx += 20) for (let gy = 12; gy < height; gy += 20) ctx.fillRect(gx, gy, 1, 1)

      // Lanes: straight through the stages, then a curve to each backend.
      ctx.strokeStyle = palette.rule
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(geo.stageX[0], height / 2)
      ctx.lineTo(geo.stageX[3], height / 2)
      ctx.stroke()
      for (const backend of ["A", "B"] as const) {
        ctx.beginPath()
        for (let i = 0; i <= 24; i++) {
          const p = curve(i / 24, backend, geo)
          if (i === 0) ctx.moveTo(p.x, p.y)
          else ctx.lineTo(p.x, p.y)
        }
        ctx.stroke()
      }

      if (animate) {
        for (const event of pending.current.splice(0)) dots.push({ start: now, event })
        if (dots.length > MAX_DOTS) dots.splice(0, dots.length - MAX_DOTS)
      } else {
        pending.current.length = 0
      }

      // Requests, drawn under the cards so they appear to pass through them.
      for (let i = dots.length - 1; i >= 0; i--) {
        const { start, event } = dots[i]
        const segments = SEGMENTS[event.Outcome]
        const travel = segments * SEGMENT_MS
        const age = now - start
        if (age > travel + FADE_MS) {
          dots.splice(i, 1)
          continue
        }
        const progress = Math.min(age / SEGMENT_MS, segments)
        const segment = Math.min(Math.floor(progress), segments - 1)
        const t = progress - segment
        const backend = event.Backend || "A"
        let p: { x: number; y: number }
        if (segment === 3) p = curve(t, backend, geo)
        else {
          const from = position(segment, event.Backend, geo)
          const to = position(segment + 1, event.Backend, geo)
          p = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }
        }
        const stopped = age > travel
        const rejected = event.Outcome !== "ok" && (stopped || event.Outcome !== "failed")
        const color = rejected ? palette.err : segment >= 3 ? (backend === "A" ? palette.a : palette.b) : palette.accent
        ctx.globalAlpha = stopped ? Math.max(0, 1 - (age - travel) / FADE_MS) : 1
        ctx.shadowColor = color
        ctx.shadowBlur = 8
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(p.x, p.y, geo.narrow ? 2.6 : 3.2, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.globalAlpha = 1
      }

      const y = height / 2
      card(geo.stageX[0], y, geo, "client", `${m.rate} req/s`, palette.rule)
      card(geo.stageX[1], y, geo, "limiter", `429s ${m.rateLimited}`, palette.rule, m.rateLimited > 0 ? palette.err : palette.muted)
      card(geo.stageX[2], y, geo, "queue", `${m.queue}/${m.capacity}`, palette.rule, m.queue >= m.capacity * 0.8 ? palette.warn : palette.muted)
      // Queue depth bar along the bottom of the queue card.
      const barW = geo.nodeW - 16
      const barY = y + geo.nodeH / 2 - 6
      ctx.fillStyle = palette.rule
      ctx.fillRect(geo.stageX[2] - barW / 2, barY, barW, 2)
      ctx.fillStyle = palette.accent
      ctx.fillRect(geo.stageX[2] - barW / 2, barY, barW * Math.min(1, m.queue / m.capacity), 2)
      card(geo.stageX[3], y, geo, "balancer", geo.narrow ? "WRR" : "smooth WRR", palette.rule)

      for (const backend of ["A", "B"] as const) {
        const state = m.states[backend]
        const stroke = state === "closed" ? (backend === "A" ? palette.a : palette.b) : state === "open" ? palette.err : palette.warn
        const detail = state === "closed" ? `${m.share[backend]}%` : state === "open" ? "OPEN" : "HALF-OPEN"
        const detailColor = state === "closed" ? palette.muted : stroke
        card(geo.backendX, BACKEND_Y[backend] * height, geo, `${backend} ×${backend === "A" ? 1 : 3}`, detail, stroke, detailColor)
      }
    }
    drawRef.current = draw

    const resize = () => {
      const rect = wrap.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      width = rect.width
      height = rect.height
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      draw(performance.now())
    }
    const observer = new ResizeObserver(resize)
    observer.observe(wrap)
    resize()

    // The panel colours follow the page theme: the toggle sets a class on <html>, the system setting flips a query.
    const repaint = () => {
      palette = readPalette(wrap)
      draw(performance.now())
    }
    const themeClass = new MutationObserver(repaint)
    themeClass.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    const systemScheme = window.matchMedia("(prefers-color-scheme: dark)")
    systemScheme.addEventListener("change", repaint)

    if (animate) {
      const tick = (now: number) => {
        draw(now)
        frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    }
    return () => {
      observer.disconnect()
      themeClass.disconnect()
      systemScheme.removeEventListener("change", repaint)
      cancelAnimationFrame(frame)
    }
  }, [animate, pending])

  // Keep the latest numbers for the draw loop; without animation, redraw whenever they change.
  useEffect(() => {
    metricsRef.current = metrics
    if (!animate) drawRef.current(performance.now())
  }, [animate, metrics])

  return (
    <div ref={wrapRef} className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        data-animating={animate ? "true" : "false"}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
      />
    </div>
  )
}
