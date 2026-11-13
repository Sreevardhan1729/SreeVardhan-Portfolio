import { About } from "@/components/site/about"
import { Achievements } from "@/components/site/achievements"
import { Contact } from "@/components/site/contact"
import { Experience } from "@/components/site/experience"
import { Footer } from "@/components/site/footer"
import { Hero } from "@/components/site/hero"
import { Projects } from "@/components/site/projects"
import { Skills } from "@/components/site/skills"
import { TopBar } from "@/components/site/top-bar"

export default function Home() {
  return (
    <>
      <TopBar />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <main id="content">
          <Hero />
          <About />
          <Experience />
          <Projects />
          <Skills />
          <Achievements />
          <Contact />
        </main>
        <Footer />
      </div>
    </>
  )
}
