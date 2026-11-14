import { portfolioData } from "@/lib/portfolio-data"
import { Highlighted } from "./highlighted"
import { Section } from "./section"

export function About() {
  const { about, education } = portfolioData
  const facts = [
    { label: "Degree", value: education.degree },
    { label: "Institution", value: education.institution },
    { label: "Graduated", value: education.graduation },
    { label: "CGPA", value: education.cgpa },
  ]
  return (
    <Section id="about" index="01" title="About">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-16">
        <div className="max-w-2xl space-y-5 text-[17px] leading-[1.75] text-muted">
          {about.map((paragraph) => (
            <p key={paragraph}>
              <Highlighted text={paragraph} />
            </p>
          ))}
        </div>
        <dl className="h-fit divide-y divide-rule overflow-hidden rounded-xl border border-rule bg-surface">
          {facts.map((fact) => (
            <div key={fact.label} className="px-4 py-3">
              <dt className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">{fact.label}</dt>
              <dd className="mt-1 text-[14px]">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Section>
  )
}
