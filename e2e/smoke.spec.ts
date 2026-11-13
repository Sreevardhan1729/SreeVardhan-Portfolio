import { expect, test } from "@playwright/test"

test("renders the name as the page heading without console errors", async ({ page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })
  await page.goto("/")
  await expect(page.locator("h1")).toHaveText("Sree Vardhan Reddy")
  expect(errors).toEqual([])
})

test("follows a dark system theme", async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: "dark" })
  const page = await context.newPage()
  await page.goto("http://localhost:3100/")
  await expect(page.locator("html")).toHaveClass(/\bdark\b/)
  await context.close()
})
