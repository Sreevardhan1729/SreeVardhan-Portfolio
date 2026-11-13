import { portfolioData } from "@/lib/portfolio-data"
import { ExternalLink } from "./external-link"
import { Section } from "./section"

export function Achievements() {
  return (
    <Section id="achievements" index="05" title="Achievements">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-rule bg-rule lg:grid-cols-4">
        {portfolioData.achievements.map((item) => (
          <div key={item.label} className="flex flex-col-reverse justify-end bg-surface p-4">
            <dt className="mt-1 text-[14px]">
              {item.href ? <ExternalLink href={item.href}>{item.label}</ExternalLink> : item.label}
              <span className="mt-0.5 block font-mono text-[11px] text-muted">{item.detail}</span>
            </dt>
            <dd className="font-mono text-2xl font-medium tracking-tight text-accent sm:text-3xl">{item.value}</dd>
          </div>
        ))}
      </dl>
    </Section>
  )
}
