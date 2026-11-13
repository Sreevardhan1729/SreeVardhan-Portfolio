import { GitMerge } from "lucide-react"
import type { ReactNode } from "react"
import { AofPanel } from "@/components/forgedb/aof-panel"
import { GatewaySimulation } from "@/components/gateway/simulation"
import { type FeaturedProject as Featured, portfolioData } from "@/lib/portfolio-data"
import { ExternalLink } from "./external-link"
import { Section } from "./section"
import { TagList } from "./tag-list"

function FeaturedProject({ project, children }: { project: Featured; children: ReactNode }) {
  return (
    <article className="border-b border-rule pb-14 last:border-b-0 last:pb-0">
      <div className="max-w-2xl">
        <p className="font-mono text-[11px] text-accent">{project.kicker}</p>
        <h3 className="mt-1.5 text-2xl font-semibold tracking-tight">{project.name}</h3>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">{project.summary}</p>
        <ul className="mt-4 space-y-2 text-[15px] leading-relaxed text-muted">
          {project.points.map((point) => (
            <li key={point} className="flex gap-2.5">
              <span aria-hidden="true" className="mt-[0.7em] size-1 shrink-0 rounded-full bg-accent" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
          <TagList tags={project.tags} label={`${project.name} technologies`} />
          {project.links.map((link) => (
            <ExternalLink key={link.href} href={link.href} className="text-sm font-medium">
              {link.label}
              <span className="sr-only"> for {project.name}</span>
            </ExternalLink>
          ))}
        </div>
      </div>
      <div className="mt-7">{children}</div>
    </article>
  )
}

function MeerkatPulls({ project }: { project: Featured }) {
  if (project.visual.kind !== "pull-requests") return null
  const { repo, pulls } = project.visual
  return (
    <div className="overflow-hidden rounded-lg border border-rule bg-surface">
      <p className="border-b border-rule px-3.5 py-2 font-mono text-[11px]">{repo} · merged pull requests</p>
      <ul>
        {pulls.map((pull) => (
          <li key={pull.number} className="flex gap-3 border-b border-rule px-3.5 py-3 last:border-b-0">
            <GitMerge role="img" aria-label="Merged" className="mt-0.5 size-4 shrink-0 text-accent" />
            <div className="min-w-0">
              <a
                href={pull.href}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[13px] [overflow-wrap:anywhere] hover:text-accent"
              >
                {pull.title}
              </a>
              <p className="mt-0.5 font-mono text-[11px] text-muted">
                #{pull.number} · <span className="text-ok">+{pull.additions}</span>{" "}
                <span className="text-err">−{pull.deletions}</span>
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
      <div className="space-y-14">
        <FeaturedProject project={forgedb}>
          <p className="mb-3 max-w-2xl text-[14px] text-muted">
            The <a href="#forgedb-terminal" className="text-foreground underline decoration-rule underline-offset-4 hover:text-accent">terminal at the top</a>{" "}
            is this database. Every write you run there goes through ForgeDB&apos;s own dispatcher, which appends it to the log:
          </p>
          <AofPanel />
        </FeaturedProject>
        <FeaturedProject project={gateway}>
          <GatewaySimulation />
        </FeaturedProject>
        <FeaturedProject project={meerkat}>
          <MeerkatPulls project={meerkat} />
        </FeaturedProject>
      </div>

      <h3 className="mt-16 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">More projects</h3>
      <ul className="mt-4 grid gap-px overflow-hidden rounded-lg border border-rule bg-rule sm:grid-cols-2">
        {portfolioData.projects.map((project) => (
          <li key={project.name} className="flex flex-col bg-surface p-4">
            <h4 className="font-medium">{project.name}</h4>
            <p className="mt-1.5 flex-1 text-[14px] leading-relaxed text-muted">{project.description}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
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
