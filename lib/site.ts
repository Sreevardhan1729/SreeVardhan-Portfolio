// Vercel sets VERCEL_PROJECT_PRODUCTION_URL to the production domain, including a custom one once added.
export const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000"

export const siteTitle = "Sree Vardhan Reddy — Software Engineer"

export const siteDescription =
  "Software engineer who builds React and TypeScript product features and the Go and Python data systems behind them. Previously at DevRev, with 168 merged PRs across 10 repositories."
