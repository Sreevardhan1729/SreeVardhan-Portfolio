import { GitMerge } from "lucide-react"
import type { ReactNode } from "react"
import { AofPanel } from "@/components/forgedb/aof-panel"
import { GatewaySimulation } from "@/components/gateway/simulation"
import { type FeaturedProject as Featured, portfolioData } from "@/lib/portfolio-data"
import { ExternalLink } from "./external-link"
import { Section } from "./section"
import { TagList } from "./tag-list"

function ProjectText({ project, index }: { project: Featured; index: number }) {
  return (
    <div>
      <p className="font-mono text-[11px] text-accent">
        {String(index + 1).padStart(2, "0")} · {project.kicker}
      </p>
      <h3 className="mt-2 text-2xl font-semibold tracking-tight sm:text-[1.7rem]">{project.name}</h3>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">{project.summary}</p>
      <ul className="mt-4 space-y-2 text-[15px] leading-relaxed text-muted">
        {project.points.map((point) => (
          <li key={point} className="flex gap-2.5">
            <span aria-hidden="true" className="mt-[0.7em] size-1 shrink-0 rounded-full bg-accent" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
        <TagList tags={project.tags} label={`${project.name} technologies`} />
        {project.links.map((link) => (
          <ExternalLink key={link.href} href={link.href} className="text-sm font-medium">
            {link.label}
            <span className="sr-only"> for {project.name}</span>
          </ExternalLink>
        ))}
      </div>
    </div>
  )
}

// "split" puts the visual beside the text on wide screens; "stacked" gives it the full width.
function FeaturedProject({
  project,
  index,
  layout,
  children,
}: {
  project: Featured
  index: number
  layout: "split" | "stacked"
  children: ReactNode
}) {
  if (layout === "stacked") {
    return (
      <article>
        <div className="max-w-3xl">
          <ProjectText project={project} index={index} />
        </div>
        <div className="mt-8">{children}</div>
      </article>
    )
  }
  return (
    <article className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start lg:gap-12">
      <ProjectText project={project} index={index} />
      <div>{children}</div>
    </article>
  )
}

function MeerkatPulls({ project }: { project: Featured }) {
  if (project.visual.kind !== "pull-requests") return null
  const { repo, pulls } = project.visual
  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center gap-3 border-b border-p-rule bg-p-bg-2 px-4 py-2.5 font-mono text-[11.5px]">
        <span aria-hidden="true" className="panel-dots">
          <span />
          <span />
          <span />
        </span>
        <span className="text-p-muted">{repo} · merged pull requests</span>
      </div>
      <ul>
        {pulls.map((pull) => (
          <li key={pull.number} className="flex gap-3 border-b border-p-rule px-4 py-3.5 last:border-b-0">
            <GitMerge role="img" aria-label="Merged" className="mt-0.5 size-4 shrink-0 text-p-b" />
            <div className="min-w-0">
              <a
                href={pull.href}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[12.5px] text-p-fg [overflow-wrap:anywhere] hover:text-p-accent"
              >
                {pull.title}
              </a>
              <p className="mt-1 font-mono text-[11px] text-p-muted">
                #{pull.number} · <span className="text-p-ok">+{pull.additions}</span>{" "}
                <span className="text-p-err">−{pull.deletions}</span>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Projects() {
  const [forgedb, gateway, meerkat] = portfolioData.featuredProjects
  return (
    <Section id="projects" index="03" title="Projects">
      <div className="space-y-20">
        <FeaturedProject project={forgedb} index={0} layout="split">
          <p className="mb-3 text-[14px] leading-relaxed text-muted">
            The{" "}
            <a href="#forgedb-terminal" className="text-foreground underline decoration-rule underline-offset-4 hover:text-accent">
              terminal at the top
            </a>{" "}
            is this database. Every write you run there goes through ForgeDB&apos;s own dispatcher, which appends it to the
            log:
          </p>
          <AofPanel />
        </FeaturedProject>
        <FeaturedProject project={gateway} index={1} layout="stacked">
          <GatewaySimulation />
        </FeaturedProject>
        <FeaturedProject project={meerkat} index={2} layout="split">
          <MeerkatPulls project={meerkat} />
        </FeaturedProject>
      </div>

      <h3 className="mt-20 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">More projects</h3>
      <ul className="mt-5 grid gap-4 sm:grid-cols-2">
        {portfolioData.projects.map((project) => (
          <li
            key={project.name}
            className="flex flex-col rounded-xl border border-rule bg-surface p-5 transition-colors hover:border-accent/50"
          >
            <h4 className="font-medium">{project.name}</h4>
            <p className="mt-1.5 flex-1 text-[14px] leading-relaxed text-muted">{project.description}</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <TagList tags={project.tags} label={`${project.name} technologies`} />
              {project.links.map((link) => (
                <ExternalLink key={link.href} href={link.href} className="text-[13px] font-medium">
                  {link.label}
                  <span className="sr-only"> for {project.name}</span>
                </ExternalLink>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </Section>
  )
}
