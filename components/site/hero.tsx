import Image from "next/image"
import { ForgeTerminal } from "@/components/forgedb/terminal"
import { portfolioData } from "@/lib/portfolio-data"
import { primaryButton, secondaryButton } from "./buttons"
import { CopyEmailButton } from "./copy-email-button"
import { ArrowUpRight, FileText, Mail } from "lucide-react"

export function Hero() {
  const { personal } = portfolioData
  return (
    <section
      id="top"
      aria-label="Introduction"
      className="grid gap-10 pb-16 pt-10 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center lg:gap-12 lg:pb-24 lg:pt-20"
    >
      <div>
        <div className="flex items-center gap-3">
          <Image
            src={personal.photo}
            alt=""
            width={44}
            height={44}
            unoptimized
            priority
            className="size-11 rounded-full border border-rule object-cover"
          />
          <p className="font-mono text-[12px] text-muted">{personal.headline}</p>
        </div>
        <h1 className="mt-6 text-[2.9rem] font-semibold leading-[0.95] tracking-[-0.035em] sm:text-6xl">
          Sree Vardhan{" "}
          <br />
          Reddy
        </h1>
        <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">{personal.tagline}</p>
        <p className="mt-4 max-w-md text-[14px] leading-relaxed text-muted">
          The terminal <span className="lg:hidden">below</span>
          <span className="hidden lg:inline">beside this</span> is <span className="text-foreground">ForgeDB</span>, the
          Redis-compatible database I wrote in C++, running in your browser. Try a command.
        </p>
        <div data-testid="hero-actions" className="mt-7 flex flex-wrap items-center gap-2">
          <a href={personal.resume} target="_blank" rel="noreferrer" className={primaryButton}>
            <FileText aria-hidden="true" className="size-4" />
            Resume
          </a>
          <a href={`mailto:${personal.email}`} className={secondaryButton}>
            <Mail aria-hidden="true" className="size-4" />
            Email
          </a>
          <CopyEmailButton email={personal.email} className={`${secondaryButton} font-mono text-[12px]`} />
          <a href={personal.social.github} target="_blank" rel="noreferrer" className={secondaryButton}>
            GitHub
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </a>
          <a href={personal.social.linkedin} target="_blank" rel="noreferrer" className={secondaryButton}>
            LinkedIn
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </a>
        </div>
      </div>
      <ForgeTerminal />
    </section>
  )
}
