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
          [...batch.map((command) => ({ id: nextId++, command })).reverse(), ...current].slice(0, MAX_ENTRIES),
        ),
      ),
    [],
  )

  return (
    <section aria-label="Append-only log" className="rounded-lg border border-rule bg-surface">
      <div className="flex items-center justify-between border-b border-rule px-3.5 py-2 font-mono text-[11px] text-muted">
        <span className="text-foreground">appendonly.aof</span>
        <span>{entries.length === 0 ? "empty" : `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`}</span>
      </div>
      {entries.length === 0 ? (
        <p className="px-3.5 py-3 text-sm text-muted">
          Run a write such as <code className="font-mono text-foreground">SET</code> or{" "}
          <code className="font-mono text-foreground">LPUSH</code> in the terminal, and the entry ForgeDB appends to its log
          shows up here. Reads are never logged.
        </p>
      ) : (
        <ol className="max-h-48 overflow-y-auto px-3.5 py-2 font-mono text-[12px] leading-relaxed [overflow-wrap:anywhere]">
          {entries.map((entry) => (
            <li key={entry.id}>{entry.command}</li>
          ))}
        </ol>
      )}
    </section>
  )
}
