"use client"

import { Command } from "cmdk"
import { useTheme } from "next-themes"
import { useEffect, useRef, useState } from "react"
import { NAV } from "@/components/site/top-bar"
import { failBackend, runInForgeDB } from "@/lib/events"
import { portfolioData } from "@/lib/portfolio-data"

type Action = { label: string; group: string; run: () => void }

const openTab = (url: string) => window.open(url, "_blank", "noopener,noreferrer")

export function CommandMenu() {
  const [open, setOpen] = useState(false)
  const openRef = useRef(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const { resolvedTheme, setTheme } = useTheme()
  openRef.current = open

  // Radix only restores focus to its own trigger, so remember what had focus and give it back on close.
  const openMenu = () => {
    const active = document.activeElement
    returnFocus.current = active instanceof HTMLElement && active !== document.body ? active : triggerRef.current
    setOpen(true)
  }
  const closeMenu = () => {
    setOpen(false)
    window.setTimeout(() => returnFocus.current?.focus({ preventScroll: true }), 0)
  }
  const { email, resume, social } = portfolioData.personal

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        if (openRef.current) closeMenu()
        else openMenu()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const actions: Action[] = [
    ...NAV.map((item) => ({
      label: `Go to ${item.label}`,
      group: "Sections",
      run: () => document.getElementById(item.id)?.scrollIntoView({ block: "start" }),
    })),
    { label: "Copy email", group: "Contact", run: () => void navigator.clipboard?.writeText(email) },
    { label: "Open resume", group: "Contact", run: () => openTab(resume) },
    { label: "Open GitHub", group: "Contact", run: () => openTab(social.github) },
    { label: "Open LinkedIn", group: "Contact", run: () => openTab(social.linkedin) },
    {
      label: "Toggle theme",
      group: "Page",
      run: () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
    },
    { label: "Run in ForgeDB: PING", group: "Live demos", run: () => runInForgeDB("PING") },
    {
      label: 'Run in ForgeDB: SET visitor "hello" EX 30',
      group: "Live demos",
      run: () => runInForgeDB('SET visitor "hello" EX 30'),
    },
    { label: "Fail backend B", group: "Live demos", run: () => failBackend("B") },
  ]
  const groups = [...new Set(actions.map((action) => action.group))]

  // Close first so focus returns to the trigger, then act on the page.
  const select = (action: Action) => {
    closeMenu()
    window.setTimeout(action.run, 0)
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openMenu}
        aria-label="Open command menu"
        className="flex h-8 items-center gap-1.5 rounded-md border border-rule px-2.5 font-mono text-[11.5px] text-muted transition-colors hover:border-accent hover:text-accent"
      >
        <span className="sm:hidden">Menu</span>
        <kbd className="hidden font-mono sm:inline">⌘K</kbd>
      </button>
      <Command.Dialog
        open={open}
        onOpenChange={(next) => (next ? openMenu() : closeMenu())}
        label="Command menu"
        overlayClassName="fixed inset-0 z-50 bg-background/70"
        contentClassName="fixed left-1/2 top-[14vh] z-50 w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-lg border border-rule bg-surface shadow-2xl"
      >
        <Command.Input
          placeholder="Jump to a section, or run a demo…"
          className="w-full border-b border-rule bg-transparent px-4 py-3 text-base text-foreground placeholder:text-muted focus:outline-none sm:text-sm"
        />
        <Command.List className="max-h-[min(24rem,60vh)] overflow-y-auto p-1.5">
          <Command.Empty className="px-3 py-6 text-center text-sm text-muted">No matching action.</Command.Empty>
          {groups.map((group) => (
            <Command.Group
              key={group}
              heading={group}
              className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10.5px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.14em] [&_[cmdk-group-heading]]:text-muted"
            >
              {actions
                .filter((action) => action.group === group)
                .map((action) => (
                  <Command.Item
                    key={action.label}
                    value={action.label}
                    onSelect={() => select(action)}
                    className="cursor-pointer rounded px-2.5 py-2 text-[14px] data-[selected=true]:bg-surface-2 data-[selected=true]:text-accent"
                  >
                    {action.label}
                  </Command.Item>
                ))}
            </Command.Group>
          ))}
        </Command.List>
      </Command.Dialog>
    </>
  )
}
