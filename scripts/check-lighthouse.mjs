// Runs Lighthouse (mobile, simulated throttling) against a running production server and checks
// the design's targets. Start the server first: pnpm build && pnpm start -p 3100
import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { chromium } from "@playwright/test"

const url = process.argv[2] ?? "http://localhost:3100/"
const report = join(mkdtempSync(join(tmpdir(), "lighthouse-")), "report.json")
const root = resolve(import.meta.dirname, "..")

// One request first, so the measurement isn't of a server that has only just started.
await fetch(url)

execFileSync(
  resolve(root, "node_modules/.bin/lighthouse"),
  [
    url,
    `--chrome-path=${chromium.executablePath()}`,
    "--chrome-flags=--headless=new",
    "--only-categories=performance,accessibility,best-practices,seo",
    "--output=json",
    `--output-path=${report}`,
    "--quiet",
  ],
  { stdio: "inherit" },
)

const result = JSON.parse(readFileSync(report, "utf8"))
const score = (id) => Math.round(result.categories[id].score * 100)
const audit = (id) => result.audits[id].numericValue
const checks = [
  ["Performance", score("performance"), (v) => v >= 90, "≥ 90"],
  ["Accessibility", score("accessibility"), (v) => v === 100, "= 100"],
  ["Best Practices", score("best-practices"), (v) => v >= 95, "≥ 95"],
  ["SEO", score("seo"), (v) => v === 100, "= 100"],
  ["LCP (ms)", Math.round(audit("largest-contentful-paint")), (v) => v <= 2000, "≤ 2000"],
  ["CLS", Number(audit("cumulative-layout-shift").toFixed(3)), (v) => v < 0.05, "< 0.05"],
  ["TBT (ms)", Math.round(audit("total-blocking-time")), () => true, "(info)"],
]

let failed = false
for (const [label, value, ok, target] of checks) {
  const pass = ok(value)
  failed ||= !pass
  console.log(`${pass ? "ok  " : "FAIL"}  ${label}: ${value} (target ${target})`)
}
for (const id of ["accessibility", "best-practices", "seo"]) {
  for (const ref of result.categories[id].auditRefs) {
    const a = result.audits[ref.id]
    if (ref.weight > 0 && a.score !== null && a.score < 1) console.log(`      ${id}: ${a.id} — ${a.title}`)
  }
}
process.exit(failed ? 1 : 0)
