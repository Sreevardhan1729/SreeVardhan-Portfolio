"use client"

import { ChevronRight } from "lucide-react"
import { type CSSProperties, useId, useState } from "react"
import type { Experience } from "@/lib/portfolio-data"
import { axisMonths, formatPeriod, periodBounds, spanPosition } from "@/lib/trace"

// Every row starts expanded so the page reads fully without JavaScript; clicking a row collapses it.
export function TraceWaterfall({ experience }: { experience: Experience }) {
  const id = useId()
  const root = experience.period!
  const months = axisMonths(root)
  const spans = experience.highlights
    .filter((highlight) => highlight.period)
    .sort((a, b) => periodBounds(a.period!).start.getTime() - periodBounds(b.period!).start.getTime())
  const [collapsed, setCollapsed] = useState<ReadonlySet<number>>(new Set())
  const allCollapsed = collapsed.size === spans.length

  const header = [
    "trace",
    "internship",
    experience.company,
    formatPeriod(root),
    ...(experience.stats ?? []).slice(0, 2).map((stat) => `${stat.value} ${stat.label}`),
  ].join(" · ")

  // Month gridlines behind every track.
  const grid: CSSProperties = {
    backgroundImage: "linear-gradient(to right, var(--p-rule) 1px, transparent 1px)",
    backgroundSize: `calc(100% / ${months.length}) 100%`,
  }

  const toggle = (index: number) =>
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })

  return (
    <div data-testid="trace-waterfall" className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-p-rule bg-p-bg-2 px-4 py-2.5 font-mono text-[11px]">
        <span className="text-p-fg/90">{header}</span>
        <button
          type="button"
          onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(spans.map((_, index) => index)))}
          className="text-p-muted transition-colors hover:text-p-accent"
        >
          {allCollapsed ? "Expand all" : "Collapse all"}
        </button>
      </div>

      <div className="hidden grid-cols-[13rem_1fr] border-b border-p-rule sm:grid" aria-hidden="true">
        <span className="px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-p-muted">span</span>
        <span className="grid pr-3.5" style={{ gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))` }}>
          {months.map((month) => (
            <span key={month} className="border-l border-p-rule py-1.5 pl-1 font-mono text-[10px] text-p-muted">
              {month}
            </span>
          ))}
        </span>
      </div>

      <div className="grid grid-cols-1 border-b border-p-rule sm:grid-cols-[13rem_1fr]">
        <span className="px-4 pt-2.5 font-mono text-[11px] text-p-muted sm:py-2.5">
          internship · {experience.role}
        </span>
        <span className="relative mx-3.5 my-2.5 h-2 sm:ml-0" style={grid} aria-hidden="true">
          <span className="absolute inset-y-0 left-0 right-0 rounded-sm border border-p-accent/60 bg-p-accent/15" />
        </span>
      </div>

      <ol aria-label="DevRev work by date">
        {spans.map((span, index) => {
          const { leftPct, widthPct } = spanPosition(span.period!, root)
          const expanded = !collapsed.has(index)
          const textId = `${id}-span-${index}`
          return (
            <li key={span.title ?? index} className="border-b border-p-rule last:border-b-0">
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={textId}
                onClick={() => toggle(index)}
                className="group grid w-full grid-cols-1 gap-y-1.5 px-3.5 py-2.5 text-left transition-colors hover:bg-p-bg-2 sm:grid-cols-[13rem_1fr] sm:items-center sm:pl-0 sm:pr-3.5"
              >
                <span className="flex items-start gap-1.5 sm:pl-2.5">
                  <ChevronRight
                    aria-hidden="true"
                    className={`mt-0.5 size-3.5 shrink-0 text-p-muted transition-transform ${expanded ? "rotate-90" : ""}`}
                  />
                  <span>
                    <span className="block text-[14px] font-medium leading-snug text-p-fg group-hover:text-p-accent">
                      {span.title?.replace(/\.$/, "")}
                    </span>
                    <span className="block font-mono text-[11px] text-p-muted">{formatPeriod(span.period!)}</span>
                  </span>
                </span>
                <span className="relative h-2 sm:h-2.5" style={grid} aria-hidden="true">
                  <span
                    className="absolute inset-y-0 rounded-sm bg-p-accent shadow-[0_0_12px_-2px_var(--p-accent)]"
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  />
                </span>
              </button>
              {expanded && (
                <p id={textId} className="px-4 pb-3.5 text-[14px] leading-relaxed text-p-muted sm:pl-[13rem] sm:pr-6">
                  {span.text}
                </p>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
