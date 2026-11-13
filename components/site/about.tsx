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
      <div className="max-w-2xl space-y-5 text-[17px] leading-[1.75] text-muted">
        {about.map((paragraph) => (
          <p key={paragraph}>
            <Highlighted text={paragraph} />
          </p>
        ))}
      </div>
      <dl className="mt-10 grid max-w-2xl gap-px overflow-hidden rounded-lg border border-rule bg-rule sm:grid-cols-2">
        {facts.map((fact) => (
          <div key={fact.label} className="bg-surface px-4 py-3">
            <dt className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">{fact.label}</dt>
            <dd className="mt-1 text-[14px]">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </Section>
  )
}
