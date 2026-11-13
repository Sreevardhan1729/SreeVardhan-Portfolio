import { portfolioData } from "@/lib/portfolio-data"
import manifest from "@/public/wasm/manifest.json"
import { ExternalLink } from "./external-link"

const repo = (name: string) => portfolioData.featuredProjects.find((project) => project.name === name)!.links[0].href

export function Footer() {
  return (
    <footer className="border-t border-rule py-8 font-mono text-[11.5px] leading-relaxed text-muted">
      <p>
        Built with Next.js. The terminal runs{" "}
        <ExternalLink href={repo("ForgeDB")}>ForgeDB@{manifest.forgedb.sha.slice(0, 7)}</ExternalLink> compiled to
        WebAssembly; the simulation runs{" "}
        <ExternalLink href={repo("AI Inference Gateway")}>ai-inference-gateway@{manifest.gateway.sha.slice(0, 7)}</ExternalLink>.
      </p>
      <p className="mt-2">© Sree Vardhan Reddy</p>
    </footer>
  )
}
