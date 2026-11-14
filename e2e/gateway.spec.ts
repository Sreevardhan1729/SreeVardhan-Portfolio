import { expect, type Page, test } from "@playwright/test"

const sim = (page: Page) => page.locator("#gateway-sim")
const chip = (page: Page, backend: "A" | "B") => page.getByTestId(`breaker-${backend}`)
const failSwitch = (page: Page, backend: "A" | "B") => page.getByRole("switch", { name: `Backend ${backend} failing` })
const gatewayTab = (page: Page) => page.getByRole("tab", { name: "Gateway", exact: true })

async function openRunning(page: Page) {
  await page.goto("/")
  await gatewayTab(page).click()
  await expect(sim(page)).toHaveAttribute("data-status", "ready", { timeout: 15_000 })
}

async function servedB(page: Page) {
  const text = await page.getByTestId("served").innerText()
  return Number(/B (\d+)/.exec(text)?.[1])
}

async function openBreaker(page: Page) {
  await failSwitch(page, "B").click()
  await expect(failSwitch(page, "B")).toHaveAttribute("aria-checked", "true")
  await expect(chip(page, "B")).toContainText("open", { timeout: 6_000 })
  await expect(chip(page, "B")).not.toContainText("half-open in 0s")
}

test("the failing switch keeps its thumb inside the track, left when off and right when on", async ({ page }) => {
  await openRunning(page)
  const toggle = failSwitch(page, "A")
  const track = toggle.locator("span[aria-hidden]")
  const thumb = track.locator("span")
  const inset = async () => {
    const outer = (await track.boundingBox())!
    const inner = (await thumb.boundingBox())!
    return { left: inner.x - outer.x, right: outer.x + outer.width - (inner.x + inner.width) }
  }
  const off = await inset()
  expect(off.left).toBeGreaterThanOrEqual(1)
  expect(off.left).toBeLessThan(off.right)
  await toggle.click()
  await expect(toggle).toHaveAttribute("aria-checked", "true")
  await expect.poll(async () => (await inset()).right).toBeLessThan(off.right)
  const on = await inset()
  expect(on.right).toBeGreaterThanOrEqual(1)
  expect(on.right).toBeLessThan(on.left)
})

test("share settles near 1:3", async ({ page }) => {
  await openRunning(page)
  await page.waitForTimeout(8_000)
  const text = await page.getByTestId("share").innerText()
  const shareA = Number(/A (\d+)%/.exec(text)?.[1])
  expect(shareA).toBeGreaterThanOrEqual(15)
  expect(shareA).toBeLessThanOrEqual(35)
})

test("failing B opens its breaker and moves traffic to A", async ({ page }) => {
  await openRunning(page)
  await openBreaker(page)
  await expect(chip(page, "B")).toContainText(/open · half-open in \d+s/)
  const before = await servedB(page)
  await page.waitForTimeout(3_000)
  expect(await servedB(page)).toBe(before)
})

test("healing B then skip cooldown closes it", async ({ page }) => {
  await openRunning(page)
  await openBreaker(page)
  await failSwitch(page, "B").click()
  await expect(failSwitch(page, "B")).toHaveAttribute("aria-checked", "false")
  await page.getByRole("button", { name: "Skip cooldown" }).click()
  await expect(chip(page, "B")).toContainText("closed", { timeout: 3_000 })
})

test("skip cooldown while B still fails reopens it", async ({ page }) => {
  await openRunning(page)
  await openBreaker(page)
  await page.getByRole("button", { name: "Skip cooldown" }).click()
  await expect(chip(page, "B")).toContainText(/open · half-open in (2\d|3\d|40)s/, { timeout: 5_000 })
})

test("burst produces 429s", async ({ page }) => {
  await openRunning(page)
  await page.getByRole("button", { name: "Burst one key" }).click()
  await expect
    .poll(async () => Number(/(\d+)/.exec(await page.getByTestId("rate-limited").innerText())?.[1]), { timeout: 3_000 })
    .toBeGreaterThan(0)
})

test("blocked wasm shows the static pipeline", async ({ page }) => {
  await page.route("**/gateway.wasm", (route) => route.abort())
  await page.goto("/")
  await gatewayTab(page).click()
  await expect(sim(page)).toHaveAttribute("data-status", "unavailable", { timeout: 15_000 })
  await expect(sim(page).getByRole("list", { name: "Request path through the gateway" })).toBeVisible()
})

test("reduced motion stops the dots", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" })
  const page = await context.newPage()
  await page.goto("http://localhost:3100/")
  await gatewayTab(page).click()
  await expect(sim(page)).toHaveAttribute("data-status", "ready", { timeout: 15_000 })
  await expect(sim(page).locator("canvas")).toHaveAttribute("data-animating", "false")
  await context.close()
})
