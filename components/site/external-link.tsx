import { ArrowUpRight } from "lucide-react"
import type { ReactNode } from "react"

export function ExternalLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`group inline-flex items-center gap-0.5 underline decoration-rule underline-offset-4 transition-colors hover:text-accent hover:decoration-accent ${className}`}
    >
      {children}
      <ArrowUpRight aria-hidden="true" className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </a>
  )
}
