import { expect, type Page, test } from "@playwright/test"
import { type Experience, portfolioData } from "../lib/portfolio-data"

const devrev: Experience = portfolioData.experience[0]
const trace = (page: Page) => page.getByTestId("trace-waterfall")
const spans = (page: Page) => trace(page).getByRole("list", { name: "DevRev work by date" }).getByRole("listitem")

test("shows the trace header", async ({ page }) => {
  await page.goto("/")
  await expect(trace(page)).toContainText("trace · internship · DevRev · Jan – Nov 2026 · 168 merged PRs · 10 repositories")
})

test("lists the seven spans in start order", async ({ page }) => {
  await page.goto("/")
  await expect(spans(page)).toHaveCount(7)
  await expect(spans(page).first()).toContainText("TypeScript strict mode")
  await expect(spans(page).last()).toContainText("Real-time export progress")
})

test("every highlight is readable without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto("http://localhost:3100/")
  for (const highlight of devrev.highlights) await expect(trace(page)).toContainText(highlight.text)
  await context.close()
})

test("clicking a row header collapses its text", async ({ page }) => {
  await page.goto("/")
  const first = spans(page).first()
  const text = devrev.highlights[0].text
  await expect(first).toContainText(text)
  await first.getByRole("button").click()
  await expect(first.getByRole("button")).toHaveAttribute("aria-expanded", "false")
  await expect(first).not.toContainText(text)
})

test("fits a 375px screen", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "narrow screens only")
  await page.goto("/")
  await trace(page).scrollIntoViewIfNeeded()
  expect(await page.evaluate(() => document.scrollingElement!.scrollWidth)).toBeLessThanOrEqual(375)
})
