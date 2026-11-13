import { TraceWaterfall } from "@/components/experience/trace-waterfall"
import { portfolioData } from "@/lib/portfolio-data"
import { ExternalLink } from "./external-link"
import { Section } from "./section"
import { TagList } from "./tag-list"

export function Experience() {
  const [devrev, ...earlier] = portfolioData.experience
  return (
    <Section id="experience" index="02" title="Experience">
      <div className="max-w-2xl">
        <h3 className="text-xl font-semibold tracking-tight">
          {devrev.role} · <ExternalLink href={devrev.companyUrl!}>{devrev.company}</ExternalLink>
        </h3>
        <p className="mt-1 font-mono text-[12px] text-muted">
          {devrev.start} – {devrev.end} · {devrev.location}
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">{devrev.summary}</p>
      </div>
      <div className="mt-6">
        <TraceWaterfall experience={devrev} />
      </div>
      <div className="mt-4">
        <TagList tags={devrev.tags} label={`${devrev.company} technologies`} />
      </div>

      <h3 className="mt-14 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">Before DevRev</h3>
      <ol className="mt-4 divide-y divide-rule border-y border-rule">
        {earlier.map((job) => (
          <li key={job.company} className="grid gap-2 py-6 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-6">
            <p className="font-mono text-[12px] text-muted">
              {job.start} – {job.end}
            </p>
            <div>
              <h4 className="font-medium">
                {job.role} · {job.companyUrl ? <ExternalLink href={job.companyUrl}>{job.company}</ExternalLink> : job.company}
              </h4>
              <p className="mt-0.5 font-mono text-[12px] text-muted">{job.location}</p>
              <ul className="mt-3 space-y-1.5 text-[15px] leading-relaxed text-muted">
                {job.highlights.map((highlight) => (
                  <li key={highlight.text} className="flex gap-2.5">
                    <span aria-hidden="true" className="mt-[0.7em] size-1 shrink-0 rounded-full bg-accent" />
                    <span>{highlight.text}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3">
                <TagList tags={job.tags} label={`${job.company} technologies`} />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  )
}
