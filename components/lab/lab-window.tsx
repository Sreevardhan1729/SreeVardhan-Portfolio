"use client"

import { Database, Waypoints } from "lucide-react"
import { type KeyboardEvent, useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react"
import { ForgeTerminal } from "@/components/forgedb/terminal"
import { GatewaySimulation } from "@/components/gateway/simulation"
import {
  FORGEDB_RUN_EVENT,
  GATEWAY_BURST_EVENT,
  GATEWAY_FAIL_EVENT,
  LAB_SHOW_EVENT,
  type LabShowDetail,
  type LabTab,
} from "@/lib/events"

const TABS = [
  { id: "forgedb", label: "ForgeDB", detail: "C++", Icon: Database },
  { id: "gateway", label: "Gateway", detail: "Go", Icon: Waypoints },
] as const

// Wide, tall screens get the scroll story: the window stays pinned and its tab follows the copy beside it. Elsewhere
// both demos stack. Keep in step with the `story` variant in app/globals.css.
const STORY_QUERY = "(min-width: 64rem) and (min-height: 37.5rem)"

function subscribeStory(onChange: () => void) {
  const query = window.matchMedia(STORY_QUERY)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

// The server renders the story. Phones switch after hydration, where CSS has already laid them out, so only roles and
// inert change.
const useStory = () =>
  useSyncExternalStore(subscribeStory, () => window.matchMedia(STORY_QUERY).matches, () => true)

const stepFor = (tab: LabTab) => document.querySelector<HTMLElement>(`[data-lab-step="${tab}"]`)

// Names a demo where there are no tabs: the title bar for ForgeDB, a divider row for the gateway.
function DemoLabel({ tab, className }: { tab: (typeof TABS)[number]; className: string }) {
  const { id, label, detail, Icon } = tab
  return (
    <p id={`lab-label-${id}`} className={`flex items-center gap-2 py-2.5 font-mono text-[12px] text-p-fg ${className}`}>
      <Icon aria-hidden="true" className="size-3.5 text-p-accent" />
      {label}
      <span aria-hidden="true" className="text-[10.5px] text-p-dim">
        {detail}
      </span>
    </p>
  )
}

// Both live demos in one window. In the story the panels share one box, so the window keeps its height either way.
export function LabWindow() {
  const tabRefs = useRef<Partial<Record<LabTab, HTMLButtonElement | null>>>({})
  const gatewayPanelRef = useRef<HTMLDivElement>(null)
  const story = useStory()
  const [active, setActive] = useState<LabTab>("forgedb")
  // The gateway module loads only once the visitor heads for it.
  const [gatewayWanted, setGatewayWanted] = useState(false)
  const shown = (tab: LabTab) => !story || active === tab

  const select = (tab: LabTab) => {
    setActive(tab)
    if (tab === "gateway") setGatewayWanted(true)
  }

  // Menu actions and page links open the demo, then bring its step (or stacked panel) to the middle of the screen.
  const show = useEffectEvent((tab: LabTab) => {
    select(tab)
    const target = story ? stepFor(tab) : document.getElementById(`lab-panel-${tab}`)
    if (!target) return
    const { top, bottom } = target.getBoundingClientRect()
    const middle = window.innerHeight / 2
    if (top > middle || bottom < middle) target.scrollIntoView({ block: "center" })
  })

  const follow = useEffectEvent((tab: LabTab) => select(tab))

  useEffect(() => {
    const onShow = (event: Event) => show((event as CustomEvent<LabShowDetail>).detail.tab)
    const onRun = () => show("forgedb")
    const onGateway = () => show("gateway")
    window.addEventListener(LAB_SHOW_EVENT, onShow)
    window.addEventListener(FORGEDB_RUN_EVENT, onRun)
    window.addEventListener(GATEWAY_FAIL_EVENT, onGateway)
    window.addEventListener(GATEWAY_BURST_EVENT, onGateway)
    return () => {
      window.removeEventListener(LAB_SHOW_EVENT, onShow)
      window.removeEventListener(FORGEDB_RUN_EVENT, onRun)
      window.removeEventListener(GATEWAY_FAIL_EVENT, onGateway)
      window.removeEventListener(GATEWAY_BURST_EVENT, onGateway)
    }
  }, [])

  useEffect(() => {
    // Start loading the gateway as its step rises into view, or as its stacked panel nears the screen.
    const near = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setGatewayWanted(true)
      },
      { rootMargin: story ? "0px 0px -15% 0px" : "0px 0px 25% 0px" },
    )
    near.observe(story ? stepFor("gateway")! : gatewayPanelRef.current!)
    // In the story, each step takes over the window as it crosses the middle of the screen.
    const steps = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) follow((entry.target as HTMLElement).dataset.labStep as LabTab)
        }
      },
      { rootMargin: "-50% 0px -49% 0px" },
    )
    if (story) for (const { id } of TABS) steps.observe(stepFor(id)!)
    return () => {
      near.disconnect()
      steps.disconnect()
    }
  }, [story])

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
    <div
      id="lab"
      className="panel min-w-0 overflow-hidden story:sticky story:top-[max(4.5rem,calc(50svh_-_13.875rem))] story:self-start"
    >
      <div className="flex items-stretch gap-3 border-b border-p-rule bg-p-bg-2 pl-4 pr-3">
        <span aria-hidden="true" className="panel-dots self-center">
          <span />
          <span />
          <span />
        </span>
        <div role="tablist" aria-label="Live demos" onKeyDown={onTabKey} className="hidden story:flex">
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
                <span aria-hidden="true" className="text-[10.5px] text-p-dim">
                  {detail}
                </span>
                {id === "gateway" && !gatewayWanted && (
                  <span aria-hidden="true" className="live-dot size-1.5 rounded-full bg-p-accent" />
                )}
              </button>
            )
          })}
        </div>
        <DemoLabel tab={TABS[0]} className="story:hidden" />
        <span className="ml-auto hidden self-center font-mono text-[10.5px] text-p-dim sm:inline">
          running in your browser
        </span>
      </div>

      <div className="story:relative">
        {/* In the story the gateway sits in the flow and sets the height; the terminal fills the same box. */}
        <div
          id="lab-panel-forgedb"
          role={story ? "tabpanel" : "region"}
          aria-labelledby={story ? "lab-tab-forgedb" : "lab-label-forgedb"}
          inert={!shown("forgedb")}
          className={`h-96 story:absolute story:inset-0 story:h-auto ${shown("forgedb") ? "" : "story:invisible"}`}
        >
          <ForgeTerminal active={shown("forgedb")} />
        </div>
        <div
          ref={gatewayPanelRef}
          id="lab-panel-gateway"
          role={story ? "tabpanel" : "region"}
          aria-labelledby={story ? "lab-tab-gateway" : "lab-label-gateway"}
          inert={!shown("gateway")}
          className={shown("gateway") ? undefined : "story:invisible"}
        >
          <DemoLabel tab={TABS[1]} className="border-y border-p-rule bg-p-bg-2 px-4 story:hidden" />
          <GatewaySimulation active={shown("gateway")} wake={gatewayWanted} />
        </div>
      </div>
    </div>
  )
}
