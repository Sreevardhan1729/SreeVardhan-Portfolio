import { expect, type Page, test } from "@playwright/test"
import { labTab as tab, sim } from "./lab-helpers"

const lab = (page: Page) => page.locator("#lab")
const step = (page: Page, name: "forgedb" | "gateway") => page.locator(`[data-lab-step="${name}"]`)
const rateLimited = async (page: Page) => Number(/(\d+)/.exec(await page.getByTestId("rate-limited").innerText())?.[1])

async function scrollToStep(page: Page, name: "forgedb" | "gateway") {
  await step(page, name).evaluate((element) => element.scrollIntoView({ block: "center", behavior: "instant" }))
}

test.describe("wide screens: one pinned window that follows the story", () => {
  test.skip(({ isMobile }) => isMobile, "phones stack the demos instead")

  test("the hero window opens on ForgeDB with the Gateway tab beside it", async ({ page }) => {
    await page.goto("/")
    await expect(tab(page, "ForgeDB")).toHaveAttribute("aria-selected", "true")
    await expect(tab(page, "Gateway")).toHaveAttribute("aria-selected", "false")
    await expect(tab(page, "Gateway")).toBeInViewport()
    await expect(page.getByRole("tabpanel", { name: "ForgeDB" })).toBeVisible()
    await expect(page.getByRole("tabpanel", { name: "Gateway" })).toBeHidden()
  })

  test("scrolling to the gateway step switches the pinned window to the gateway, and scrolling back returns", async ({
    page,
  }) => {
    await page.goto("/")
    const pinnedAt = (await lab(page).boundingBox())!.y
    await scrollToStep(page, "gateway")
    await expect(tab(page, "Gateway")).toHaveAttribute("aria-selected", "true")
    await expect(sim(page)).toHaveAttribute("data-status", "ready", { timeout: 15_000 })
    await expect(sim(page).locator("canvas")).toBeInViewport()
    expect(Math.abs((await lab(page).boundingBox())!.y - pinnedAt)).toBeLessThanOrEqual(1)
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }))
    await expect(tab(page, "ForgeDB")).toHaveAttribute("aria-selected", "true")
    await expect(page.getByLabel("ForgeDB command")).toBeVisible()
  })

  test("the gateway step's buttons break the live gateway, and the fail button turns into recover", async ({ page }) => {
    await page.goto("/")
    await scrollToStep(page, "gateway")
    await expect(sim(page)).toHaveAttribute("data-status", "ready", { timeout: 15_000 })
    const gatewayStep = step(page, "gateway")
    await gatewayStep.getByRole("button", { name: "Fail backend A" }).click()
    await expect(page.getByRole("switch", { name: "Backend A failing" })).toHaveAttribute("aria-checked", "true")
    await expect(gatewayStep.getByRole("button", { name: "Fail backend A" })).toHaveCount(0)
    await expect(gatewayStep.getByRole("status").filter({ hasText: "Backend A is" })).toHaveText("Backend A is failing.")
    await expect(page.getByTestId("breaker-A")).toContainText("open", { timeout: 8_000 })
    await gatewayStep.getByRole("button", { name: "Burst one key" }).click()
    await expect.poll(() => rateLimited(page), { timeout: 3_000 }).toBeGreaterThan(0)
    await gatewayStep.getByRole("button", { name: "Recover backend A" }).click()
    await expect(page.getByRole("switch", { name: "Backend A failing" })).toHaveAttribute("aria-checked", "false")
    await expect(gatewayStep.getByRole("button", { name: "Fail backend A" })).toBeVisible()
    await expect(gatewayStep.getByRole("status").filter({ hasText: "Backend A is" })).toHaveText("Backend A is healthy.")
  })

  test("the gateway step's button follows the window's failing switch", async ({ page }) => {
    await page.goto("/")
    await scrollToStep(page, "gateway")
    await expect(sim(page)).toHaveAttribute("data-status", "ready", { timeout: 15_000 })
    await page.getByRole("switch", { name: "Backend A failing" }).click()
    await expect(step(page, "gateway").getByRole("button", { name: "Recover backend A" })).toBeVisible()
    await page.getByRole("switch", { name: "Backend A failing" }).click()
    await expect(step(page, "gateway").getByRole("button", { name: "Fail backend A" })).toBeVisible()
  })

  test("opening the Gateway tab runs the live simulation in place", async ({ page }) => {
    await page.goto("/")
    await tab(page, "Gateway").click()
    await expect(tab(page, "Gateway")).toHaveAttribute("aria-selected", "true")
    await expect(sim(page)).toHaveAttribute("data-status", "ready", { timeout: 15_000 })
    await expect(sim(page).locator("canvas")).toBeInViewport()
    await expect(page.getByLabel("ForgeDB command")).toBeHidden()
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
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

  test("the gateway module waits until the visitor heads for it", async ({ page }) => {
    const requested: string[] = []
    page.on("request", (request) => {
      if (request.url().endsWith("/gateway.wasm")) requested.push(request.url())
    })
    await page.goto("/")
    await expect(page.locator("#forgedb-terminal [data-testid=forgedb-status]")).toContainText("live")
    await page.waitForTimeout(1_000)
    expect(requested).toEqual([])
    await page.mouse.wheel(0, 300)
    await expect.poll(() => requested.length).toBeGreaterThan(0)
    await expect(tab(page, "ForgeDB")).toHaveAttribute("aria-selected", "true")
  })

  test("hovering the Gateway tab also starts loading it", async ({ page }) => {
    const requested: string[] = []
    page.on("request", (request) => {
      if (request.url().endsWith("/gateway.wasm")) requested.push(request.url())
    })
    await page.goto("/")
    await expect(page.locator("#forgedb-terminal [data-testid=forgedb-status]")).toContainText("live")
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

  test("the Projects entry scrolls back up to the gateway step", async ({ page }) => {
    await page.goto("/")
    await page.locator("#projects").getByRole("link", { name: "Run the live simulation" }).click()
    await expect(tab(page, "Gateway")).toHaveAttribute("aria-selected", "true")
    await expect(step(page, "gateway")).toBeInViewport()
    await expect(sim(page)).toBeInViewport()
  })
})

test.describe("phones: the demos stack, terminal first", () => {
  test.skip(({ isMobile }) => !isMobile, "wide screens use the pinned window")

  test("the gateway sits right under the terminal, with no tabs", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("tablist", { name: "Live demos" })).toBeHidden()
    const forgedb = page.getByRole("region", { name: "ForgeDB", exact: true })
    const gateway = page.getByRole("region", { name: "Gateway", exact: true })
    await expect(forgedb).toBeVisible()
    await expect(gateway).toBeVisible()
    const top = (await forgedb.boundingBox())!
    expect((await gateway.boundingBox())!.y).toBeGreaterThanOrEqual(top.y + top.height - 1)
    await expect(step(page, "gateway")).toBeHidden()
  })

  test("the gateway loads as it nears the screen and runs there", async ({ page }) => {
    const requested: string[] = []
    page.on("request", (request) => {
      if (request.url().endsWith("/gateway.wasm")) requested.push(request.url())
    })
    await page.goto("/")
    await expect(page.locator("#forgedb-terminal [data-testid=forgedb-status]")).toContainText(/live|recorded/)
    await page.waitForTimeout(1_000)
    expect(requested).toEqual([])
    await sim(page).scrollIntoViewIfNeeded()
    await expect(sim(page)).toHaveAttribute("data-status", "ready", { timeout: 15_000 })
    await expect(sim(page).locator("canvas")).toHaveAttribute("data-animating", "true")
  })

  test("the Projects entry scrolls back up to the gateway", async ({ page }) => {
    await page.goto("/")
    await page.locator("#projects").getByRole("link", { name: "Run the live simulation" }).click()
    await expect(sim(page)).toBeInViewport()
  })
})
