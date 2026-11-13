import { describe, expect, it } from "vitest"
import { type Experience, portfolioData } from "@/lib/portfolio-data"
import { axisMonths, formatPeriod, periodBounds, spanPosition } from "@/lib/trace"

const root = { start: "2026-01", end: "2026-11" }
const day = (iso: string) => new Date(`${iso}T00:00:00Z`)

describe("trace periods", () => {
  it("expands month-only dates to the first and last day of the month", () => {
    expect(periodBounds({ start: "2026-05", end: "2026-09" })).toEqual({ start: day("2026-05-01"), end: day("2026-09-30") })
    expect(periodBounds({ start: "2026-05-22", end: "2026-06-11" })).toEqual({
      start: day("2026-05-22"),
      end: day("2026-06-11"),
    })
  })

  it("places the root span across the whole axis", () => {
    expect(spanPosition(root, root)).toEqual({ leftPct: 0, widthPct: 100 })
  })

  it("puts the export work at the end of the internship", () => {
    const { leftPct, widthPct } = spanPosition({ start: "2026-10-27", end: "2026-11-12" }, root)
    expect(leftPct + widthPct).toBeGreaterThan(94)
    expect(leftPct + widthPct).toBeLessThanOrEqual(100)
  })

  it("keeps very short spans visible and inside the root", () => {
    expect(spanPosition({ start: "2026-05-22", end: "2026-05-22" }, root).widthPct).toBeGreaterThanOrEqual(1.5)
    const late = spanPosition({ start: "2026-11-30", end: "2026-12-15" }, root)
    expect(late.leftPct + late.widthPct).toBeLessThanOrEqual(100)
  })

  it("formats month and day precision the way the page shows them", () => {
    expect(formatPeriod({ start: "2026-05", end: "2026-09" })).toBe("May – Sep 2026")
    expect(formatPeriod({ start: "2026-05-22", end: "2026-06-11" })).toBe("22 May – 11 Jun 2026")
    expect(formatPeriod(root)).toBe("Jan – Nov 2026")
  })

  it("labels one axis tick per month of the root", () => {
    expect(axisMonths(root)).toEqual(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"])
    expect(axisMonths({ start: "2026-11", end: "2027-02" })).toEqual(["Nov", "Dec", "Jan", "Feb"])
  })

  it("gives every DevRev highlight a period, starting with strict mode", () => {
    const devrev: Experience = portfolioData.experience[0]
    expect(devrev.company).toBe("DevRev")
    expect(devrev.period).toEqual(root)
    expect(devrev.highlights).toHaveLength(7)
    expect(devrev.highlights.every((highlight) => highlight.period)).toBe(true)
    expect(devrev.highlights[0]).toEqual({
      title: "TypeScript strict mode.",
      text: "Moved shared and feature libraries of DevRev's web app to strict TypeScript across 23 PRs, fixing errors with real type narrowing instead of assertions, and removed about 1,700 lines of dead code.",
      period: { start: "2026-02-24", end: "2026-04-10" },
    })
  })
})
