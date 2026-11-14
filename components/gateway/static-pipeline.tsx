import { portfolioData } from "@/lib/portfolio-data"

const gateway = portfolioData.featuredProjects.find((project) => project.visual.kind === "pipeline")!.visual
const pipeline = gateway.kind === "pipeline" ? gateway : null

// The request path as plain HTML: shown before the simulation loads, whenever it cannot, and in the project write-up.
export function StaticPipeline({ layout = "grid" }: { layout?: "grid" | "column" }) {
  if (!pipeline) return null
  const steps = [
    ...pipeline.stages,
    {
      label: "Backends",
      detail: pipeline.backends.map((backend) => `${backend.label.replace("Backend ", "")} ${backend.detail}`).join(" · "),
    },
  ]
  if (layout === "column") {
    return (
      <ol aria-label="Request path through the gateway" className="px-4 py-2">
        {steps.map((step, index) => (
          <li key={step.label} className="flex items-baseline gap-3 border-b border-p-rule py-2.5 last:border-b-0">
            <span className="w-5 shrink-0 font-mono text-[10px] text-p-accent">{String(index + 1).padStart(2, "0")}</span>
            <span className="w-32 shrink-0 text-[13px] font-medium text-p-fg">{step.label}</span>
            <span className="min-w-0 font-mono text-[11px] text-p-muted [overflow-wrap:anywhere]">{step.detail}</span>
          </li>
        ))}
      </ol>
    )
  }
  return (
    <ol
      aria-label="Request path through the gateway"
      className="grid h-full grid-cols-3 content-center gap-2 p-3 sm:grid-cols-5 sm:gap-2.5 sm:p-4"
    >
      {steps.map((step, index) => (
        <li key={step.label} className="rounded-lg border border-p-rule bg-p-bg-3 px-2.5 py-2">
          <span className="block font-mono text-[10px] text-p-accent">{String(index + 1).padStart(2, "0")}</span>
          <span className="mt-0.5 block text-[13px] font-medium text-p-fg">{step.label}</span>
          <span className="mt-0.5 hidden font-mono text-[10px] leading-snug text-p-muted [overflow-wrap:anywhere] sm:block">
            {step.detail}
          </span>
        </li>
      ))}
    </ol>
  )
}
