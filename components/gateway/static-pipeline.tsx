import { portfolioData } from "@/lib/portfolio-data"

const gateway = portfolioData.featuredProjects.find((project) => project.visual.kind === "pipeline")!.visual
const pipeline = gateway.kind === "pipeline" ? gateway : null

// The request path as plain HTML: shown before the simulation loads and whenever it cannot.
export function StaticPipeline() {
  if (!pipeline) return null
  return (
    <ol
      aria-label="Request path through the gateway"
      className="grid h-full grid-cols-2 content-center gap-2 p-3 sm:grid-cols-5 sm:gap-3 sm:p-4"
    >
      {pipeline.stages.map((stage, index) => (
        <li key={stage.label} className="reveal rounded border border-rule bg-surface-2 px-2.5 py-2">
          <span className="block font-mono text-[10px] text-muted">{String(index + 1).padStart(2, "0")}</span>
          <span className="block text-[13px] font-medium">{stage.label}</span>
          <span className="mt-0.5 block font-mono text-[10.5px] leading-snug text-muted [overflow-wrap:anywhere]">
            {stage.detail}
          </span>
        </li>
      ))}
      <li className="reveal rounded border border-rule bg-surface-2 px-2.5 py-2">
        <span className="block font-mono text-[10px] text-muted">05</span>
        <span className="block text-[13px] font-medium">Backends</span>
        <span className="mt-0.5 block font-mono text-[10.5px] leading-snug text-muted">
          {pipeline.backends.map((backend) => `${backend.label.replace("Backend ", "")} ${backend.detail}`).join(" · ")}
        </span>
      </li>
    </ol>
  )
}
