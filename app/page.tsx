import { About } from "@/components/site/about"
import { Achievements } from "@/components/site/achievements"
import { Contact } from "@/components/site/contact"
import { Experience } from "@/components/site/experience"
import { Footer } from "@/components/site/footer"
import { Hero } from "@/components/site/hero"
import { Projects } from "@/components/site/projects"
import { Skills } from "@/components/site/skills"
import { TopBar } from "@/components/site/top-bar"

const container = "mx-auto max-w-6xl px-4 sm:px-6 lg:px-8"

export default function Home() {
  return (
    <>
      <TopBar />
      <main id="content">
        <div className="relative isolate overflow-clip border-b border-rule">
          <div aria-hidden="true" className="dot-grid absolute inset-0 -z-10" />
          <div className={container}>
            <Hero />
          </div>
        </div>
        <div className={container}>
          <About />
          <Experience />
          <Projects />
          <Skills />
          <Achievements />
          <Contact />
        </div>
      </main>
      <div className={container}>
        <Footer />
      </div>
    </>
  )
}
