import { portfolioData } from "@/lib/portfolio-data"
import { secondaryButton } from "./buttons"
import { ContactForm } from "./contact-form"
import { CopyEmailButton } from "./copy-email-button"
import { ExternalLink } from "./external-link"
import { Section } from "./section"

export function Contact() {
  const { email, resume } = portfolioData.personal
  return (
    <Section id="contact" index="06" title="Contact">
      <h3 className="text-2xl font-semibold tracking-tight">Get in touch</h3>
      <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-muted">
        I&apos;m interested in software engineering roles where I can work across product and systems. Email is the
        fastest way to reach me.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <a
          href={`mailto:${email}`}
          className="break-all text-lg font-medium underline decoration-accent/50 underline-offset-4 transition-colors hover:text-accent"
        >
          {email}
        </a>
        <CopyEmailButton email={email} className={`${secondaryButton} font-mono text-[12px]`} />
      </div>
      <p className="mt-4 text-sm text-muted">
        <ExternalLink href={resume}>View my resume</ExternalLink>
      </p>
      <div className="mt-10 max-w-2xl">
        <ContactForm />
      </div>
    </Section>
  )
}
