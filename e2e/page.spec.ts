import { expect, type Page, test } from "@playwright/test"
import { portfolioData } from "../lib/portfolio-data"

const SECTIONS = ["About", "Experience", "Projects", "Skills", "Achievements", "Contact"]
const plain = (text: string) => text.replace(/\*\*/g, "")

async function scrollThroughPage(page: Page) {
  const height = await page.evaluate(() => document.body.scrollHeight)
  for (let y = 0; y < height; y += 600) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y)
    await page.waitForTimeout(50)
  }
}

test("has all six section headings", async ({ page }) => {
  await page.goto("/")
  for (const name of SECTIONS) await expect(page.getByRole("heading", { level: 2, name, exact: true })).toBeVisible()
})

test("puts Resume, Email, GitHub and LinkedIn in the first screen", async ({ page }) => {
  await page.goto("/")
  const viewport = page.viewportSize()!
  const actions = page.getByTestId("hero-actions")
  for (const name of ["Resume", "Email", "GitHub", "LinkedIn"]) {
    const box = await actions.getByRole("link", { name, exact: true }).boundingBox()
    expect(box, `${name} is rendered`).not.toBeNull()
    expect(box!.y + box!.height, `${name} is above the fold`).toBeLessThanOrEqual(viewport.height)
  }
})

test("never scrolls sideways at 375px", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "narrow screens only")
  await page.goto("/")
  await scrollThroughPage(page)
  expect(await page.evaluate(() => document.scrollingElement!.scrollWidth)).toBeLessThanOrEqual(375)
})

test("reads fully without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto("http://localhost:3100/")
  for (const paragraph of portfolioData.about) await expect(page.locator("#about")).toContainText(plain(paragraph))
  for (const highlight of portfolioData.experience[1].highlights) await expect(page.locator("#experience")).toContainText(highlight.text)
  const names = [...portfolioData.featuredProjects, ...portfolioData.projects].map((project) => project.name)
  for (const name of names) await expect(page.locator("#projects")).toContainText(name)
  await context.close()
})

test("theme toggle switches between light and dark", async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: "light" })
  const page = await context.newPage()
  await page.goto("http://localhost:3100/")
  await expect(page.locator("html")).not.toHaveClass(/\bdark\b/)
  await page.getByRole("button", { name: "Switch to dark theme" }).click()
  await expect(page.locator("html")).toHaveClass(/\bdark\b/)
  await page.getByRole("button", { name: "Switch to light theme" }).click()
  await expect(page.locator("html")).not.toHaveClass(/\bdark\b/)
  await context.close()
})

test("scroll reveals run when motion is allowed", async ({ page }) => {
  await page.goto("/")
  const running = await page.evaluate(
    () => document.getAnimations().filter((a) => (a.effect as KeyframeEffect | null)?.target?.classList.contains("reveal")).length,
  )
  expect(running).toBeGreaterThan(0)
})

test("reduced motion turns off the scroll reveals", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" })
  const page = await context.newPage()
  await page.goto("http://localhost:3100/")
  expect(await page.locator(".reveal").count()).toBeGreaterThan(0)
  const running = await page.evaluate(
    () => document.getAnimations().filter((a) => (a.effect as KeyframeEffect | null)?.target?.classList.contains("reveal")).length,
  )
  expect(running).toBe(0)
  await context.close()
})

test("contact form explains what is missing", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "Send message" }).click()
  await expect(page.getByText("Please add your name.")).toBeVisible()
  await expect(page.getByText("Please add your email.")).toBeVisible()
  await expect(page.getByText("Please write a message.")).toBeVisible()
})

test("loads and scrolls without console errors", async ({ page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/")
  await scrollThroughPage(page)
  await page.waitForTimeout(1500)
  expect(errors).toEqual([])
})
