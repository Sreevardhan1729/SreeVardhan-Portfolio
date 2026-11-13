"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // The theme is unknown during server rendering, so keep the slot's size without an icon.
  if (!mounted) return <span className="block size-8" aria-hidden="true" />

  const isDark = resolvedTheme === "dark"
  const next = isDark ? "light" : "dark"
  const apply = () => {
    // Set the class right away so the view transition captures the new theme, then let next-themes persist it.
    document.documentElement.classList.remove(isDark ? "dark" : "light")
    document.documentElement.classList.add(next)
    setTheme(next)
  }
  const toggle = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (document.startViewTransition && !reduce) document.startViewTransition(apply)
    else apply()
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="flex size-8 items-center justify-center rounded-md text-muted transition-colors hover:text-accent"
    >
      {isDark ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
    </button>
  )
}
