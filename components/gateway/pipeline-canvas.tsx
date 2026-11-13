"use client"

import { type RefObject, useEffect, useRef } from "react"
import type { BackendName, BreakerState, SimEvent } from "@/lib/gateway/types"

type Props = {
  pending: RefObject<SimEvent[]>
  states: Record<BackendName, BreakerState>
  animate: boolean
}

type Dot = { start: number; event: SimEvent }
type Colors = Record<"accent" | "err" | "ok" | "rule" | "foreground" | "muted" | "surface2" | "mono", string>

const MAX_DOTS = 60
const SEGMENT_MS = 260
const FADE_MS = 240
const NODES = [
  { label: "client", x: 0.07 },
  { label: "limiter", x: 0.285 },
  { label: "queue", x: 0.5 },
  { label: "balancer", x: 0.715 },
] as const
const BACKEND_X = 0.92
const BACKEND_Y: Record<BackendName, number> = { A: 0.28, B: 0.72 }
const EDGE_PADDING = 30 // half a node, so the first and last nodes never touch the edge

// How many path segments a request travels before it stops: rejected at the limiter, shed at the queue, and so on.
const SEGMENTS: Record<SimEvent["Outcome"], number> = { rate_limited: 1, shed: 2, no_backend: 3, ok: 4, failed: 4 }

function readColors(): Colors {
  const style = getComputedStyle(document.documentElement)
  const v = (name: string) => style.getPropertyValue(name).trim()
  return {
    accent: v("--accent"),
    err: v("--err"),
    ok: v("--ok"),
    rule: v("--rule"),
    foreground: v("--foreground"),
    muted: v("--muted"),
    surface2: v("--surface-2"),
    // Canvas fonts cannot use CSS variables, so resolve the monospace family next/font registered.
    mono: v("--font-mono") || "ui-monospace, monospace",
  }
}

export function PipelineCanvas({ pending, states, animate }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const statesRef = useRef(states)
  const drawRef = useRef<(now: number) => void>(() => {})
  statesRef.current = states

  useEffect(() => {
    const wrap = wrapRef.current!
    const canvas = canvasRef.current!
    const ctx = canvas.getContext("2d")!
    const dots: Dot[] = []
    let width = 0
    let height = 0
    let colors = readColors()
    let colorsReadAt = 0
    let frame = 0
    const x = (fraction: number) => EDGE_PADDING + fraction * (width - 2 * EDGE_PADDING)

    const point = (segment: number, backend: BackendName | "") => {
      if (segment < NODES.length) return { x: x(NODES[segment].x), y: height / 2 }
      return { x: x(BACKEND_X), y: BACKEND_Y[backend || "A"] * height }
    }

    const node = (cx: number, y: number, label: string, stroke: string, caption?: string) => {
      const narrow = width < 480
      ctx.font = `${narrow ? 9.5 : 10.5}px ${colors.mono}`
      const w = Math.max(ctx.measureText(label).width + (narrow ? 9 : 14), narrow ? 34 : 44)
      ctx.fillStyle = colors.surface2
      ctx.strokeStyle = stroke
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(cx - w / 2, y - 11, w, 22, 4)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = colors.foreground
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(label, cx, y + 0.5)
      if (caption) {
        ctx.fillStyle = stroke
        ctx.font = `${narrow ? 9 : 9.5}px ${colors.mono}`
        ctx.fillText(caption, cx, y + 22)
      }
    }

    const draw = (now: number) => {
      if (now - colorsReadAt > 500) {
        colors = readColors()
        colorsReadAt = now
      }
      ctx.clearRect(0, 0, width, height)

      // Lanes between stages.
      ctx.strokeStyle = colors.rule
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x(NODES[0].x), height / 2)
      ctx.lineTo(x(NODES[3].x), height / 2)
      for (const backend of ["A", "B"] as const) {
        ctx.moveTo(x(NODES[3].x), height / 2)
        ctx.lineTo(x(BACKEND_X), BACKEND_Y[backend] * height)
      }
      ctx.stroke()

      if (animate) {
        for (const event of pending.current.splice(0)) dots.push({ start: now, event })
        if (dots.length > MAX_DOTS) dots.splice(0, dots.length - MAX_DOTS)
      } else {
        pending.current.length = 0
      }

      // Dots, drawn under the nodes so they appear to enter them.
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
        const from = point(segment, event.Backend)
        const to = point(segment + 1, event.Backend)
        const t = progress - segment
        const stopped = age > travel
        const bad = event.Outcome !== "ok"
        ctx.globalAlpha = stopped ? 1 - (age - travel) / FADE_MS : 1
        ctx.fillStyle = bad && (stopped || event.Outcome !== "failed") ? colors.err : colors.accent
        ctx.beginPath()
        ctx.arc(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      }

      for (const stage of NODES) node(x(stage.x), height / 2, stage.label, colors.rule)
      for (const backend of ["A", "B"] as const) {
        const state = statesRef.current[backend]
        const stroke = state === "closed" ? colors.ok : state === "open" ? colors.err : colors.accent
        node(x(BACKEND_X), BACKEND_Y[backend] * height, `${backend} ×${backend === "A" ? 1 : 3}`, stroke, state)
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

    if (animate) {
      const tick = (now: number) => {
        draw(now)
        frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    }
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [animate, pending])

  // Without animation, redraw only when a breaker changes.
  useEffect(() => {
    if (!animate) drawRef.current(performance.now())
  }, [animate, states])

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
