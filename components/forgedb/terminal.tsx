"use client"

import { type FormEvent, type KeyboardEvent, useEffect, useEffectEvent, useRef, useState } from "react"
import chips from "@/lib/forgedb/chips.json"
import type { ForgeStatus } from "@/lib/forgedb/session"
import { getForgeSession } from "@/lib/forgedb/shared"
import { FORGEDB_RUN_EVENT, type ForgeRunDetail } from "@/lib/events"
import manifest from "@/public/wasm/manifest.json"

const PROMPT = "127.0.0.1:6379>"
const MAX_LINES = 200
const STATUS_TEXT: Record<ForgeStatus | "recorded", string> = {
  recorded: "recorded session",
  idle: "recorded session",
  loading: "loading…",
  ready: "ready",
  unavailable: "live demo unavailable, showing a recorded session",
}

type Entry = { id: number; source: "recorded" | "note" | "live"; input?: string; output: string[] | null }

let nextId = 0
const recordedEntries = (): Entry[] =>
  manifest.forgedb.session.map((item) => ({ id: nextId++, source: "recorded", input: item.input, output: item.output }))

const lineCount = (entries: Entry[]) => entries.reduce((total, e) => total + (e.input ? 1 : 0) + (e.output?.length ?? 0), 0)

function trimmed(entries: Entry[]): Entry[] {
  const kept = [...entries]
  while (kept.length > 1 && lineCount(kept) > MAX_LINES) kept.shift()
  return kept
}

const isError = (line: string) => line.startsWith("(error)") || line === "Invalid argument(s)"

export function ForgeTerminal() {
  const [entries, setEntries] = useState<Entry[]>(recordedEntries)
  const [status, setStatus] = useState<ForgeStatus>("idle")
  const [draft, setDraft] = useState("")
  const history = useRef<string[]>([])
  const historyIndex = useRef(-1)
  const logRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const run = (command: string) => {
    const session = getForgeSession()
    const id = nextId++
    setEntries((current) => trimmed([...current, { id, source: "live", input: command, output: null }]))
    if (command.trim()) history.current = [command, ...history.current.filter((c) => c !== command)].slice(0, 50)
    historyIndex.current = -1
    void session.run(command).then((result) => {
      setEntries((current) =>
        result.clear
          ? []
          : trimmed(current.map((entry) => (entry.id === id ? { ...entry, output: result.lines } : entry))),
      )
    })
  }
  const runFromMenu = useEffectEvent((command: string) => {
    rootRef.current?.scrollIntoView({ block: "center" })
    run(command)
  })

  // Load the module after the page has loaded and gone idle, unless the visitor reaches the terminal first.
  useEffect(() => {
    const session = getForgeSession()
    const stopStatus = session.onStatus((next) => {
      setStatus(next)
      if (next === "ready") {
        setEntries((current) => [
          {
            id: nextId++,
            source: "note",
            output: [
              `Connected to ForgeDB@${manifest.forgedb.sha.slice(0, 7)}, running in this tab.`,
              "Data lives in memory and resets on reload.",
              "",
              "Try these, or tap the chips below:",
              '  SET visitor "hello" EX 30   then  TTL visitor',
              "  LPUSH queue a b c           then  LRANGE queue 0 -1",
              "  HELP                        lists every command",
            ],
          },
          ...current.filter((entry) => entry.source === "live"),
        ])
      }
    })
    let idleHandle: number | undefined
    const schedule = () => {
      const start = () => void session.start()
      if (typeof window.requestIdleCallback === "function") idleHandle = window.requestIdleCallback(start, { timeout: 3000 })
      else idleHandle = window.setTimeout(start, 1500)
    }
    if (document.readyState === "complete") schedule()
    else window.addEventListener("load", schedule, { once: true })

    const onRun = (event: Event) => {
      runFromMenu((event as CustomEvent<ForgeRunDetail>).detail.command)
    }
    window.addEventListener(FORGEDB_RUN_EVENT, onRun)
    return () => {
      stopStatus()
      window.removeEventListener("load", schedule)
      window.removeEventListener(FORGEDB_RUN_EVENT, onRun)
      if (idleHandle !== undefined) {
        if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idleHandle)
        window.clearTimeout(idleHandle)
      }
    }
  }, [])

  useEffect(() => {
    const log = logRef.current
    if (log) log.scrollTop = log.scrollHeight
  }, [entries])

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    run(draft)
    setDraft("")
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return
    event.preventDefault()
    const next = historyIndex.current + (event.key === "ArrowUp" ? 1 : -1)
    if (next < -1 || next >= history.current.length) return
    historyIndex.current = next
    setDraft(next === -1 ? "" : history.current[next])
  }

  const statusTone =
    status === "ready" ? "bg-ok" : status === "unavailable" ? "bg-err" : status === "loading" ? "bg-accent" : "bg-muted"

  return (
    <div
      id="forgedb-terminal"
      ref={rootRef}
      onFocusCapture={() => void getForgeSession().start()}
      onPointerDownCapture={() => void getForgeSession().start()}
      className="overflow-hidden rounded-lg border border-rule bg-surface shadow-[0_1px_0_0_var(--rule)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-rule px-3.5 py-2 font-mono text-[11px] text-muted">
        <span className="text-foreground">forgedb · 127.0.0.1:6379</span>
        <span data-testid="forgedb-status" className="flex items-center gap-1.5">
          <span aria-hidden="true" className={`inline-block size-1.5 rounded-full ${statusTone}`} />
          ForgeDB · C++17 compiled to WebAssembly · {STATUS_TEXT[status]}
        </span>
      </div>

      <div
        ref={logRef}
        role="log"
        aria-label="ForgeDB output"
        aria-live="polite"
        tabIndex={0}
        className="h-64 overflow-y-auto px-3.5 py-3 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere] sm:h-72 sm:px-4 sm:text-[13px]"
      >
        {entries.map((entry) => (
          <div key={entry.id} className={entry.source === "recorded" ? "opacity-80" : undefined}>
            {entry.input !== undefined && (
              <div>
                <span className="text-accent">{PROMPT}</span> {entry.input}
              </div>
            )}
            {entry.output?.map((line, index) => (
              <div key={index} className={isError(line) ? "text-err" : entry.source === "note" ? "text-muted" : undefined}>
                {line || "\u00a0"}
              </div>
            ))}
          </div>
        ))}
      </div>

      <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-rule px-3.5 py-2.5 font-mono sm:px-4">
        <span aria-hidden="true" className="shrink-0 text-[13px] text-accent">
          {PROMPT}
        </span>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          aria-label="ForgeDB command"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="type a command, e.g. GET visitor"
          className="min-w-0 flex-1 bg-transparent text-base text-foreground placeholder:text-muted/70 focus:outline-none sm:text-[13px]"
        />
      </form>

      <div role="group" aria-label="Example commands" className="flex flex-wrap gap-1.5 border-t border-rule px-3 py-2.5">
        {chips.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => run(chip)}
            className="rounded border border-rule bg-surface-2 px-2 py-1 font-mono text-[11.5px] text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  )
}
