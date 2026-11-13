import { portfolioData } from "@/lib/portfolio-data"
import { Section } from "./section"

export function Skills() {
  return (
    <Section id="skills" index="04" title="Skills">
      <dl className="divide-y divide-rule border-y border-rule">
        {portfolioData.skills.map((skill) => (
          <div key={skill.group} className="grid gap-1.5 py-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6">
            <dt className="pt-0.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">{skill.group}</dt>
            <dd className="text-[15px] leading-relaxed">{skill.items.join(" · ")}</dd>
          </div>
        ))}
      </dl>
    </Section>
  )
}
