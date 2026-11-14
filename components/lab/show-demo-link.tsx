"use client"

import type { ReactNode } from "react"
import { type LabTab, showDemo } from "@/lib/events"

// Opens a tab of the demo window at the top. Without JavaScript it is a plain link to the window.
export function ShowDemoLink({ tab, className, children }: { tab: LabTab; className?: string; children: ReactNode }) {
  return (
    <a
      href="#lab"
      onClick={(event) => {
        event.preventDefault()
        showDemo(tab)
      }}
      className={className}
    >
      {children}
    </a>
  )
}
