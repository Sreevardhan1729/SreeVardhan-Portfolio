"use client"

import dynamic from "next/dynamic"
import { useEffect, useEffectEvent, useRef, useState } from "react"

const loadDialog = () => import("./command-dialog")
const CommandDialog = dynamic(() => loadDialog().then((module) => module.CommandDialog), { ssr: false })

export function CommandMenu() {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)

  // Radix only restores focus to its own trigger, so remember what had focus and give it back on close.
  const openMenu = () => {
    const active = document.activeElement
    returnFocus.current = active instanceof HTMLElement && active !== document.body ? active : triggerRef.current
    setLoaded(true)
    setOpen(true)
  }
  const closeMenu = () => {
    setOpen(false)
    window.setTimeout(() => returnFocus.current?.focus({ preventScroll: true }), 0)
  }

  const toggleFromShortcut = useEffectEvent(() => (open ? closeMenu() : openMenu()))

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        toggleFromShortcut()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openMenu}
        onPointerEnter={() => void loadDialog()}
        onFocus={() => void loadDialog()}
        aria-label="Open command menu"
        className="flex h-8 items-center gap-1.5 rounded-md border border-rule px-2.5 font-mono text-[11.5px] text-muted transition-colors hover:border-accent hover:text-accent"
      >
        <span className="sm:hidden">Menu</span>
        <kbd className="hidden font-mono sm:inline">⌘K</kbd>
      </button>
      {loaded && <CommandDialog open={open} onClose={closeMenu} />}
    </>
  )
}
