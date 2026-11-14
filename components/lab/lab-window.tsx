"use client"

import { Database, Waypoints } from "lucide-react"
import { type KeyboardEvent, useEffect, useEffectEvent, useRef, useState } from "react"
import { ForgeTerminal } from "@/components/forgedb/terminal"
import { GatewaySimulation } from "@/components/gateway/simulation"
import { FORGEDB_RUN_EVENT, GATEWAY_FAIL_EVENT, LAB_SHOW_EVENT, type LabShowDetail, type LabTab } from "@/lib/events"

const TABS = [
  { id: "forgedb", label: "ForgeDB", detail: "C++", Icon: Database },
  { id: "gateway", label: "Gateway", detail: "Go", Icon: Waypoints },
] as const

// Both live demos in one window. The panels share a grid cell, so the window keeps one height whichever tab is open.
export function LabWindow() {
  const rootRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<Partial<Record<LabTab, HTMLButtonElement | null>>>({})
  const [active, setActive] = useState<LabTab>("forgedb")
  // The gateway module loads only once the visitor reaches for its tab.
  const [gatewayWanted, setGatewayWanted] = useState(false)

  const select = (tab: LabTab) => {
    setActive(tab)
    if (tab === "gateway") setGatewayWanted(true)
  }

  const show = useEffectEvent((tab: LabTab) => {
    select(tab)
    rootRef.current?.scrollIntoView({ block: "center" })
  })

  useEffect(() => {
    const onShow = (event: Event) => show((event as CustomEvent<LabShowDetail>).detail.tab)
    const onRun = () => show("forgedb")
    const onFail = () => show("gateway")
    window.addEventListener(LAB_SHOW_EVENT, onShow)
    window.addEventListener(FORGEDB_RUN_EVENT, onRun)
    window.addEventListener(GATEWAY_FAIL_EVENT, onFail)
    return () => {
      window.removeEventListener(LAB_SHOW_EVENT, onShow)
      window.removeEventListener(FORGEDB_RUN_EVENT, onRun)
      window.removeEventListener(GATEWAY_FAIL_EVENT, onFail)
    }
  }, [])

  const onTabKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = TABS.findIndex((tab) => tab.id === active)
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % TABS.length
        : event.key === "ArrowLeft"
          ? (index - 1 + TABS.length) % TABS.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? TABS.length - 1
              : -1
    if (next === -1) return
    event.preventDefault()
    select(TABS[next].id)
    tabRefs.current[TABS[next].id]?.focus()
  }

  return (
    <div id="lab" ref={rootRef} className="panel min-w-0 overflow-hidden">
      <div className="flex items-stretch gap-3 border-b border-p-rule bg-p-bg-2 pl-4 pr-3">
        <span aria-hidden="true" className="panel-dots self-center">
          <span />
          <span />
          <span />
        </span>
        <div role="tablist" aria-label="Live demos" onKeyDown={onTabKey} className="flex">
          {TABS.map(({ id, label, detail, Icon }) => {
            const selected = active === id
            return (
              <button
                key={id}
                ref={(element) => {
                  tabRefs.current[id] = element
                }}
                id={`lab-tab-${id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`lab-panel-${id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => select(id)}
                onPointerEnter={() => id === "gateway" && setGatewayWanted(true)}
                onFocus={() => id === "gateway" && setGatewayWanted(true)}
                className="relative flex items-center gap-2 px-3 py-2.5 font-mono text-[12px] text-p-muted transition-colors after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-p-accent after:opacity-0 after:transition-opacity hover:text-p-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-p-accent aria-selected:text-p-fg aria-selected:after:opacity-100"
              >
                <Icon aria-hidden="true" className={`size-3.5 ${selected ? "text-p-accent" : ""}`} />
                {label}
                <span aria-hidden="true" className="hidden text-[10.5px] text-p-dim sm:inline">
                  {detail}
                </span>
                {id === "gateway" && !gatewayWanted && (
                  <span aria-hidden="true" className="live-dot size-1.5 rounded-full bg-p-accent" />
                )}
              </button>
            )
          })}
        </div>
        <span className="ml-auto hidden self-center font-mono text-[10.5px] text-p-dim sm:inline">
          running in your browser
        </span>
      </div>

      <div className="relative">
        {/* The gateway sits in the flow and sets the height; the terminal fills the same box. */}
        <div
          id="lab-panel-gateway"
          role="tabpanel"
          aria-labelledby="lab-tab-gateway"
          inert={active !== "gateway"}
          className={active === "gateway" ? undefined : "invisible"}
        >
          <GatewaySimulation active={active === "gateway"} wake={gatewayWanted} />
        </div>
        <div
          id="lab-panel-forgedb"
          role="tabpanel"
          aria-labelledby="lab-tab-forgedb"
          inert={active !== "forgedb"}
          className={`absolute inset-0 ${active === "forgedb" ? "" : "invisible"}`}
        >
          <ForgeTerminal active={active === "forgedb"} />
        </div>
      </div>
    </div>
  )
}
