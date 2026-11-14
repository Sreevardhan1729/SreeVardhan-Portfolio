import { expect, type Page, test } from "@playwright/test"

const lab = (page: Page) => page.locator("#lab")
const tab = (page: Page, name: "ForgeDB" | "Gateway") =>
  page.getByRole("tablist", { name: "Live demos" }).getByRole("tab", { name, exact: true })
const sim = (page: Page) => page.locator("#gateway-sim")

test("the hero window opens on ForgeDB with the Gateway tab beside it", async ({ page }) => {
  await page.goto("/")
  await expect(tab(page, "ForgeDB")).toHaveAttribute("aria-selected", "true")
  await expect(tab(page, "Gateway")).toHaveAttribute("aria-selected", "false")
  await expect(tab(page, "Gateway")).toBeInViewport()
  await expect(page.getByRole("tabpanel", { name: "ForgeDB" })).toBeVisible()
  await expect(page.getByRole("tabpanel", { name: "Gateway" })).toBeHidden()
})

test("opening the Gateway tab runs the live simulation in the hero", async ({ page }) => {
  await page.goto("/")
  await tab(page, "Gateway").click()
  await expect(tab(page, "Gateway")).toHaveAttribute("aria-selected", "true")
  await expect(sim(page)).toHaveAttribute("data-status", "ready", { timeout: 15_000 })
  await expect(sim(page).locator("canvas")).toBeInViewport()
  await expect(page.getByLabel("ForgeDB command")).toBeHidden()
})

test("arrow, Home and End keys move between the tabs", async ({ page }) => {
  await page.goto("/")
  await tab(page, "ForgeDB").focus()
  await page.keyboard.press("ArrowRight")
  await expect(tab(page, "Gateway")).toBeFocused()
  await expect(tab(page, "Gateway")).toHaveAttribute("aria-selected", "true")
  await page.keyboard.press("ArrowLeft")
  await expect(tab(page, "ForgeDB")).toHaveAttribute("aria-selected", "true")
  await page.keyboard.press("End")
  await expect(tab(page, "Gateway")).toHaveAttribute("aria-selected", "true")
  await page.keyboard.press("Home")
  await expect(tab(page, "ForgeDB")).toBeFocused()
})

test("the gateway module waits until its tab is wanted", async ({ page }) => {
  const requested: string[] = []
  page.on("request", (request) => {
    if (request.url().endsWith("/gateway.wasm")) requested.push(request.url())
  })
  await page.goto("/")
  await expect(page.locator("#forgedb-terminal [data-testid=forgedb-status]")).toContainText("live")
  await page.waitForTimeout(1_000)
  expect(requested).toEqual([])
  await tab(page, "Gateway").hover()
  await expect.poll(() => requested.length).toBeGreaterThan(0)
})

test("switching tabs keeps the window the same height", async ({ page }) => {
  await page.goto("/")
  const before = (await lab(page).boundingBox())!.height
  await tab(page, "Gateway").click()
  await expect(sim(page)).toHaveAttribute("data-status", "ready", { timeout: 15_000 })
  expect(Math.abs((await lab(page).boundingBox())!.height - before)).toBeLessThanOrEqual(1)
})

test("the Projects entry opens the live simulation at the top", async ({ page }) => {
  await page.goto("/")
  await page.locator("#projects").getByRole("link", { name: "Run the live simulation" }).click()
  await expect(tab(page, "Gateway")).toHaveAttribute("aria-selected", "true")
  await expect(sim(page)).toBeInViewport()
})
