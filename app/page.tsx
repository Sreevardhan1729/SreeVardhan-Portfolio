import { portfolioData } from "@/lib/portfolio-data"

export default function Home() {
  const { personal } = portfolioData
  return (
    <main id="content" className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
      <h1 className="text-4xl font-semibold tracking-tight">{personal.name}</h1>
      <p className="mt-3 text-muted">{personal.headline}</p>
    </main>
  )
}
