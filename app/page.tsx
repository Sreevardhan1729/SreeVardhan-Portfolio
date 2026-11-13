import { TraceWaterfall } from "@/components/experience/trace-waterfall"
import { AofPanel } from "@/components/forgedb/aof-panel"
import { ForgeTerminal } from "@/components/forgedb/terminal"
import { GatewaySimulation } from "@/components/gateway/simulation"
import { portfolioData } from "@/lib/portfolio-data"

export default function Home() {
  const { personal } = portfolioData
  return (
    <main id="content" className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
      <h1 className="text-4xl font-semibold tracking-tight">{personal.name}</h1>
      <p className="mt-3 text-muted">{personal.headline}</p>
      {/* Temporary mounts until the page is assembled. */}
      <div className="mt-10 grid gap-6">
        <ForgeTerminal />
        <AofPanel />
        <GatewaySimulation />
        <TraceWaterfall experience={portfolioData.experience[0]} />
      </div>
    </main>
  )
}
