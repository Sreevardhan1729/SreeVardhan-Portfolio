import { CommandMenu } from "@/components/command-menu"
import { NAV } from "@/lib/nav"
import { ThemeToggle } from "./theme-toggle"

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a href="#top" className="flex items-center gap-2.5 font-mono text-[12px]">
          <span className="flex size-7 items-center justify-center rounded border border-accent text-[11px] text-accent">SV</span>
          <span className="hidden sm:inline">Sree Vardhan Reddy</span>
        </a>
        <nav aria-label="Sections" className="hidden lg:block">
          <ul className="flex items-center gap-5 font-mono text-[12px] text-muted">
            {NAV.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className="transition-colors hover:text-accent">
                  {item.label.toLowerCase()}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-1.5">
          <CommandMenu />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
