import type { ReactNode } from "react"

// A numbered page section: the label column sticks beside the content on wide screens.
export function Section({ id, index, title, children }: { id: string; index: string; title: string; children: ReactNode }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="scroll-mt-16 border-t border-rule py-16 sm:py-20 lg:grid lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-10"
    >
      <header className="mb-8 lg:sticky lg:top-24 lg:mb-0 lg:self-start">
        <p className="font-mono text-[11px] text-accent">{index}</p>
        <h2 id={`${id}-heading`} className="mt-1 font-mono text-[13px] uppercase tracking-[0.18em]">
          {title}
        </h2>
      </header>
      <div className="reveal min-w-0">{children}</div>
    </section>
  )
}
