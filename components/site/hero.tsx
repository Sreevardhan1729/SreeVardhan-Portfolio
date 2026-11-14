import { ArrowUpRight, FileText, Mail } from "lucide-react"
import Image from "next/image"
import { GatewayStep } from "@/components/lab/gateway-step"
import { LabWindow } from "@/components/lab/lab-window"
import { portfolioData } from "@/lib/portfolio-data"
import { primaryButton, secondaryButton } from "./buttons"
import { CopyEmailButton } from "./copy-email-button"

export function Hero() {
  const { personal } = portfolioData
  return (
    <section
      id="top"
      aria-label="Introduction"
      className="grid gap-12 pb-20 pt-12 sm:pt-16 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-center lg:gap-14 lg:pb-28 lg:pt-24 story:pb-16 story:pt-0"
    >
      <div>
        {/* With room for the scroll story, this first step fills the screen beside the pinned window. */}
        <div
          data-lab-step="forgedb"
          className="story:flex story:min-h-[calc(100svh_-_3.5rem)] story:flex-col story:justify-center story:py-12"
        >
          <div className="flex flex-wrap items-center gap-3">
            <Image
              src={personal.photo}
              alt=""
              width={40}
              height={40}
              unoptimized
              className="size-10 rounded-full border border-rule object-cover"
            />
            <p className="font-mono text-[12px] text-muted">{personal.headline}</p>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-surface px-2.5 py-0.5 font-mono text-[11px] text-muted">
              <span aria-hidden="true" className="live-dot size-1.5 rounded-full bg-ok" />
              Open to SWE roles
            </span>
          </div>
          <h1 className="mt-7 text-[3.3rem] font-semibold leading-[0.92] tracking-[-0.045em] sm:text-7xl">
            Sree Vardhan{" "}
            <br />
            Reddy
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-muted sm:text-xl">{personal.tagline}</p>
          <p className="mt-5 flex max-w-md gap-2.5 text-[14px] leading-relaxed text-muted">
            <span aria-hidden="true" className="font-mono text-accent">
              <span className="lg:hidden">↓</span>
              <span className="hidden lg:inline">→</span>
            </span>
            <span>
              That window runs two of my systems live in your browser:{" "}
              <span className="font-medium text-foreground">ForgeDB</span>, the Redis-compatible database I wrote in C++, and
              my <span className="font-medium text-foreground">LLM gateway</span> in Go.{" "}
              <span className="pointer-coarse:hidden">Just start typing</span>
              <span className="hidden pointer-coarse:inline">Tap the terminal to type</span>;{" "}
              <span className="hidden story:inline">scroll on and the window switches to the gateway.</span>
              <span className="story:hidden">the gateway runs right below it.</span>
            </span>
          </p>
          <div data-testid="hero-actions" className="mt-8 flex flex-wrap items-center gap-2">
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
        <GatewayStep />
      </div>
      <LabWindow />
    </section>
  )
}
