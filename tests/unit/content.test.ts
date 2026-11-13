import { describe, expect, it } from "vitest"
import { portfolioData } from "@/lib/portfolio-data"

describe("portfolio content", () => {
  it("carries the verified personal details over from the current site", () => {
    expect(portfolioData.personal.name).toBe("Sree Vardhan Reddy")
    expect(portfolioData.education.cgpa).toBe("9.36 / 10")
  })
})
