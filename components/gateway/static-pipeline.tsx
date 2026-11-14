import { portfolioData } from "@/lib/portfolio-data"

const gateway = portfolioData.featuredProjects.find((project) => project.visual.kind === "pipeline")!.visual
const pipeline = gateway.kind === "pipeline" ? gateway : null

// The request path as plain HTML: shown before the simulation loads and whenever it cannot.
export function StaticPipeline() {
  if (!pipeline) return null
  const steps = [
    ...pipeline.stages,
    {
      label: "Backends",
      detail: pipeline.backends.map((backend) => `${backend.label.replace("Backend ", "")} ${backend.detail}`).join(" · "),
    },
  ]
  return (
    <ol
      aria-label="Request path through the gateway"
      className="grid h-full grid-cols-2 content-center gap-2.5 p-4 sm:grid-cols-5 sm:gap-3 sm:p-5"
    >
      {steps.map((step, index) => (
        <li key={step.label} className="reveal rounded-lg border border-p-rule bg-p-bg-3 px-3 py-2.5">
          <span className="block font-mono text-[10px] text-p-accent">{String(index + 1).padStart(2, "0")}</span>
          <span className="mt-0.5 block text-[13px] font-medium text-p-fg">{step.label}</span>
          <span className="mt-0.5 block font-mono text-[10.5px] leading-snug text-p-muted [overflow-wrap:anywhere]">
            {step.detail}
          </span>
        </li>
      ))}
    </ol>
  )
}
