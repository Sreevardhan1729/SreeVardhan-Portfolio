"use client"

import { useEffect, useState } from "react"
import { getForgeSession } from "@/lib/forgedb/shared"

const MAX_ENTRIES = 50

type Entry = { id: number; command: string }
let nextId = 0

// Shows the writes ForgeDB's own dispatcher sends to its append-only log, newest first.
export function AofPanel() {
  const [entries, setEntries] = useState<Entry[]>([])

  useEffect(
    () =>
      getForgeSession().onAof((batch) =>
        setEntries((current) =>
          [...batch.map((command) => ({ id: ++nextId, command })).reverse(), ...current].slice(0, MAX_ENTRIES),
        ),
      ),
    [],
  )

  return (
    <section aria-label="Append-only log" className="panel overflow-hidden">
      <div className="flex items-center gap-3 border-b border-p-rule bg-p-bg-2 px-4 py-2.5 font-mono text-[11.5px]">
        <span aria-hidden="true" className="panel-dots">
          <span />
          <span />
          <span />
        </span>
        <span className="text-p-muted">tail -f appendonly.aof</span>
        <span className="ml-auto text-[10.5px] text-p-muted">
          {entries.length === 0 ? "empty" : `${entries.length} ${entries.length === 1 ? "write" : "writes"}`}
        </span>
      </div>
      {entries.length === 0 ? (
        <p className="px-4 py-4 text-[13.5px] leading-relaxed text-p-muted">
          Run a write such as <code className="font-mono text-p-fg">SET</code> or{" "}
          <code className="font-mono text-p-fg">LPUSH</code> in the terminal and the entry ForgeDB appends to its log lands
          here. Reads are never logged.
        </p>
      ) : (
        <ol className="max-h-52 overflow-y-auto px-4 py-2.5 font-mono text-[12px] leading-[1.8] [overflow-wrap:anywhere]">
          {entries.map((entry) => (
            <li key={entry.id} className="flex gap-3">
              <span aria-hidden="true" className="w-6 shrink-0 text-right text-p-dim">
                {entry.id}
              </span>
              <span className="text-p-fg/90">{entry.command}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
