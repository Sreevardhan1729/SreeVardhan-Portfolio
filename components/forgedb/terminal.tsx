"use client"

import { type FormEvent, type KeyboardEvent, useEffect, useEffectEvent, useRef, useState } from "react"
import chips from "@/lib/forgedb/chips.json"
import type { ForgeStatus, RunResult } from "@/lib/forgedb/session"
import { getForgeSession } from "@/lib/forgedb/shared"
import { capturedKey } from "@/lib/forgedb/type-anywhere"
import { FORGEDB_RUN_EVENT, type ForgeRunDetail } from "@/lib/events"
import manifest from "@/public/wasm/manifest.json"

const PROMPT = "127.0.0.1:6379>"
const MAX_LINES = 200
const SHA = manifest.forgedb.sha.slice(0, 7)
// A short, real session typed out once the live module is ready, unless the visitor gets there first.
const INTRO = ["PING", 'SET visitor "hello" EX 30', "TTL visitor"]
const TYPE_MS = 38
const YOUR_TURN = "# your turn · type any command, e.g. GET visitor"
const STATUS_TEXT: Record<ForgeStatus, string> = {
  idle: "recorded",
  loading: "connecting…",
  ready: "live",
  unavailable: "unavailable · recorded",
}

type Entry = { id: number; source: "recorded" | "note" | "live"; input?: string; output: string[] | null }
type IntroState = "pending" | "running" | "done" | "skipped"

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
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Keys that change the prompt: they mean the visitor is using the terminal.
const EDIT_KEYS = new Set(["Backspace", "Delete", "Enter", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"])
const editsPrompt = (event: KeyboardEvent) =>
  !event.ctrlKey && !event.metaKey && !event.altKey && (event.key.length === 1 || EDIT_KEYS.has(event.key))

// Keys typed with nothing focused, or with a button in the demo window focused, belong to the prompt.
function keysAreFree(): boolean {
  const focused = document.activeElement
  return !focused || focused === document.body || (focused.tagName === "BUTTON" && focused.closest("#lab") !== null)
}

export function ForgeTerminal({ active }: { active: boolean }) {
  const [entries, setEntries] = useState<Entry[]>(recordedEntries)
  const [status, setStatus] = useState<ForgeStatus>("idle")
  const [draft, setDraft] = useState("")
  const [intro, setIntro] = useState<IntroState>("pending")
  const [visible, setVisible] = useState(false)
  const [focused, setFocused] = useState(false)
  // Once the visitor leaves the prompt, its cursor stops blinking and turns hollow, like an unfocused terminal.
  const [leftPrompt, setLeftPrompt] = useState(false)
  const [caret, setCaret] = useState<number | null>(null) // null: at the end of the draft
  const history = useRef<string[]>([])
  const historyIndex = useRef(-1)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const interacted = useRef(false)
  const introStarted = useRef(false)
  const introTyping = useRef(false)
  const autoFocusTried = useRef(false)
  const autoFocusing = useRef(false)
  const unmounted = useRef(false)

  const run = (command: string): Promise<RunResult> => {
    const id = nextId++
    setEntries((current) => trimmed([...current, { id, source: "live", input: command, output: null }]))
    if (command.trim()) history.current = [command, ...history.current.filter((c) => c !== command)].slice(0, 50)
    historyIndex.current = -1
    return getForgeSession()
      .run(command)
      .then((result) => {
        setEntries((current) =>
          result.clear ? [] : trimmed(current.map((entry) => (entry.id === id ? { ...entry, output: result.lines } : entry))),
        )
        return result
      })
  }

  // Any sign the visitor wants the terminal stops the intro, clears its half-typed command and starts loading the module.
  const engage = () => {
    if (autoFocusing.current) return
    interacted.current = true
    if (introTyping.current) {
      introTyping.current = false
      setDraft("")
      setCaret(null)
    }
    setIntro((state) => (state === "done" ? state : "skipped"))
    void getForgeSession().start()
  }

  const runFromMenu = useEffectEvent((command: string) => {
    engage()
    void run(command)
  })

  // On landing with a mouse or trackpad, focus the prompt so its cursor blinks there, unless the visitor already
  // focused something. Phones are left alone: focusing there can open the on-screen keyboard over the page.
  const autoFocus = useEffectEvent((onScreen: boolean) => {
    if (autoFocusTried.current) return
    autoFocusTried.current = true
    if (!onScreen || !active || interacted.current || !keysAreFree()) return
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return
    autoFocusing.current = true
    inputRef.current?.focus({ preventScroll: true })
    autoFocusing.current = false
  })

  const onPageKey = useEffectEvent((event: globalThis.KeyboardEvent) => {
    if (!active || !visible) return
    const key = capturedKey(event, keysAreFree())
    if (key === null) return
    event.preventDefault()
    inputRef.current?.focus({ preventScroll: true })
    setDraft((current) => current + key)
    setCaret(null)
  })

  const playIntro = useEffectEvent(async () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const stopped = () => interacted.current || unmounted.current
    await sleep(reduce ? 0 : 600)
    if (stopped()) return
    setIntro("running")
    for (const command of INTRO) {
      // After a stop, never touch the draft again: it belongs to the visitor now.
      if (!reduce) {
        for (let i = 1; i <= command.length; i++) {
          if (stopped()) return
          introTyping.current = true
          setDraft(command.slice(0, i))
          setCaret(null)
          await sleep(TYPE_MS)
        }
        await sleep(160)
      }
      if (stopped()) return
      introTyping.current = false
      setDraft("")
      setCaret(null)
      await run(command)
      await sleep(reduce ? 0 : 420)
    }
    if (stopped()) return
    setIntro("done")
    setEntries((current) => trimmed([...current, { id: nextId++, source: "note", output: [YOUR_TURN] }]))
  })

  // Load the module after the page has loaded and gone idle, unless the visitor reaches the terminal first.
  useEffect(() => {
    // Development mounts effects twice; the second mount must undo the first cleanup.
    unmounted.current = false
    const session = getForgeSession()
    const stopStatus = session.onStatus((next) => {
      setStatus(next)
      if (next === "ready") {
        setEntries((current) => [
          {
            id: nextId++,
            source: "note",
            output: [
              `# ForgeDB@${SHA} · C++17 → WebAssembly`,
              "# in memory, in this tab · HELP lists commands",
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

    const onRun = (event: Event) => runFromMenu((event as CustomEvent<ForgeRunDetail>).detail.command)
    const onKey = (event: globalThis.KeyboardEvent) => onPageKey(event)
    window.addEventListener(FORGEDB_RUN_EVENT, onRun)
    window.addEventListener("keydown", onKey)
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting)
        autoFocus(entry.isIntersecting)
      },
      { threshold: 0.4 },
    )
    observer.observe(rootRef.current!)
    return () => {
      unmounted.current = true
      stopStatus()
      observer.disconnect()
      window.removeEventListener("load", schedule)
      window.removeEventListener(FORGEDB_RUN_EVENT, onRun)
      window.removeEventListener("keydown", onKey)
      if (idleHandle !== undefined) {
        if (typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idleHandle)
        window.clearTimeout(idleHandle)
      }
    }
  }, [])

  useEffect(() => {
    if (status !== "ready" || !visible || !active || introStarted.current || interacted.current) return
    introStarted.current = true
    void playIntro()
  }, [status, visible, active])

  useEffect(() => {
    const scroller = scrollRef.current
    if (scroller) scroller.scrollTop = scroller.scrollHeight
  }, [entries, draft])

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    void run(draft)
    setDraft("")
    setCaret(null)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") return inputRef.current?.blur()
    if (!editsPrompt(event)) return
    // Typing over the intro replaces its half-typed command instead of adding to it.
    if (introTyping.current) {
      event.preventDefault()
      engage()
      if (event.key.length === 1) {
        setDraft(event.key)
        setCaret(null)
      }
      return
    }
    engage()
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return
    event.preventDefault()
    const next = historyIndex.current + (event.key === "ArrowUp" ? 1 : -1)
    if (next < -1 || next >= history.current.length) return
    historyIndex.current = next
    setDraft(next === -1 ? "" : history.current[next])
    setCaret(null)
  }

  // Clicking the screen focuses the prompt, unless the visitor is selecting text to copy.
  const focusPrompt = () => {
    if (window.getSelection()?.isCollapsed !== false) inputRef.current?.focus({ preventScroll: true })
  }

  const hasRecorded = entries.some((entry) => entry.source === "recorded")
  const caretAt = caret === null ? draft.length : Math.min(caret, draft.length)
  const blinking = focused || !leftPrompt
  const dot =
    status === "ready" ? "bg-p-ok" : status === "unavailable" ? "bg-p-err" : status === "loading" ? "bg-p-warn live-dot" : "bg-p-dim"

  return (
    <div
      id="forgedb-terminal"
      ref={rootRef}
      data-intro={intro}
      onFocusCapture={engage}
      onPointerDownCapture={engage}
      className="flex h-full flex-col"
    >
      <div className="flex items-center gap-3 border-b border-p-rule px-4 py-2">
        <span className="truncate font-mono text-[11px] text-p-muted">redis-cli · 127.0.0.1:6379</span>
        <span
          data-testid="forgedb-status"
          className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-p-rule bg-p-bg-2 px-2.5 py-0.5 font-mono text-[10.5px] text-p-muted"
        >
          <span aria-hidden="true" className={`inline-block size-1.5 rounded-full ${dot}`} />
          {STATUS_TEXT[status]}
        </span>
      </div>

      <div
        ref={scrollRef}
        onClick={focusPrompt}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-3.5 font-mono text-[12.5px] leading-[1.7] sm:px-5 sm:text-[13px]"
      >
        <div role="log" aria-label="ForgeDB output" aria-live="polite" className="whitespace-pre-wrap [overflow-wrap:anywhere]">
          {hasRecorded && (
            <div className="text-p-muted">
              {status === "unavailable"
                ? "# recorded at build time · the live demo couldn't load"
                : "# recorded at build time · connecting to live ForgeDB…"}
            </div>
          )}
          {entries.map((entry) => (
            <div key={entry.id} className={entry.source === "recorded" ? "opacity-70" : undefined}>
              {entry.input !== undefined && (
                <div>
                  <span className="text-p-accent">{PROMPT}</span> <span className="text-p-fg">{entry.input}</span>
                </div>
              )}
              {entry.output?.map((line, index) => (
                <div
                  key={index}
                  className={isError(line) ? "text-p-err" : entry.source === "note" ? "text-p-muted" : "text-p-fg/85"}
                >
                  {line || " "}
                </div>
              ))}
            </div>
          ))}
        </div>
        <form onSubmit={onSubmit} className="flex items-center">
          <span aria-hidden="true" className="shrink-0 text-p-accent">
            {PROMPT}&nbsp;
          </span>
          <span className="relative flex min-w-0 flex-1 overflow-hidden">
            <input
              ref={inputRef}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value)
                setCaret(event.target.selectionStart)
              }}
              onSelect={(event) => setCaret(event.currentTarget.selectionStart)}
              onKeyDown={onKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                setFocused(false)
                setLeftPrompt(true)
              }}
              aria-label="ForgeDB command"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="w-full bg-transparent text-base text-p-fg caret-transparent focus:outline-none sm:text-[13px]"
            />
            {/* A shell's block cursor drawn over the input at the caret, with the character under it inverted. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 flex items-center whitespace-pre text-base sm:text-[13px]"
            >
              <span className="invisible">{draft.slice(0, caretAt)}</span>
              <span
                key={`${caretAt}:${draft.length}`}
                data-testid="prompt-cursor"
                data-blinking={blinking}
                className={
                  blinking
                    ? "prompt-cursor bg-p-accent text-p-bg"
                    : "text-transparent outline outline-1 -outline-offset-1 outline-p-accent/70"
                }
              >
                {draft[caretAt] ?? " "}
              </span>
              {draft === "" && intro !== "running" && (
                <span className="ml-2.5 text-p-dim">
                  {focused ? (
                    "type a command · ↵ runs it · ↑ history"
                  ) : (
                    <>
                      <span className="pointer-coarse:hidden">start typing</span>
                      <span className="hidden pointer-coarse:inline">tap to type</span>
                    </>
                  )}
                </span>
              )}
            </span>
          </span>
        </form>
      </div>

      <div
        role="group"
        aria-label="Example commands"
        className="flex items-center gap-2 overflow-x-auto border-t border-p-rule bg-p-bg-2 px-4 py-2.5 [mask-image:linear-gradient(to_right,black_88%,transparent)] [scrollbar-width:none]"
      >
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-p-muted">try</span>
        {chips.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => void run(chip)}
            className="shrink-0 rounded-md border border-p-rule bg-p-bg-3 px-2 py-1 font-mono text-[11.5px] text-p-fg/90 transition-colors hover:border-p-accent/70 hover:text-p-accent"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  )
}
