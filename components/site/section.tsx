import type { ReactNode } from "react"

// A numbered page section with a full-width heading rule.
export function Section({ id, index, title, children }: { id: string; index: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-16 py-20 sm:py-24">
      <header className="mb-10 flex items-baseline gap-4 border-b border-rule pb-5 sm:mb-12">
        <span className="font-mono text-[12px] text-accent">{index}</span>
        <h2 id={`${id}-heading`} className="text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">
          {title}
        </h2>
      </header>
      <div className="reveal min-w-0">{children}</div>
    </section>
  )
}
