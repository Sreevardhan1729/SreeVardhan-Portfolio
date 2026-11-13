import { expect, type Page, test } from "@playwright/test"

const status = (page: Page) => page.locator("#forgedb-terminal [data-testid=forgedb-status]")
const output = (page: Page) => page.getByRole("log", { name: "ForgeDB output" })
const input = (page: Page) => page.getByLabel("ForgeDB command")
const aofPanel = (page: Page) => page.getByRole("region", { name: "Append-only log" })

async function runCommand(page: Page, command: string) {
  await input(page).fill(command)
  await input(page).press("Enter")
}

async function openReady(page: Page) {
  await page.goto("/")
  await expect(status(page)).toContainText("ready")
}

test("PING chip returns PONG", async ({ page }) => {
  await openReady(page)
  await page.getByRole("button", { name: "PING", exact: true }).click()
  await expect(output(page)).toContainText("PONG")
})

test("SET then GET round-trips", async ({ page }) => {
  await openReady(page)
  await runCommand(page, 'SET a "hi there"')
  await expect(output(page)).toContainText("OK")
  await runCommand(page, "GET a")
  await expect(output(page)).toContainText('"hi there"')
})

test("TTL counts down", async ({ page }) => {
  await openReady(page)
  await runCommand(page, 'SET visitor "hello" EX 30')
  await runCommand(page, "TTL visitor")
  await expect(output(page)).toContainText("(integer) 30")
  await page.waitForTimeout(2000)
  await runCommand(page, "TTL visitor")
  await expect(output(page)).toContainText(/\(integer\) (27|28|29)/)
})

test("wrong arity errors without crashing", async ({ page }) => {
  await openReady(page)
  await runCommand(page, "GET")
  await expect(output(page)).toContainText(/\(error\) GET accepts only 1 argument/)
  await runCommand(page, "PING")
  await expect(output(page)).toContainText("PONG")
})

test("commands sent before ready run in order", async ({ page }) => {
  await page.route("**/*.wasm", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    await route.continue()
  })
  await page.goto("/")
  await page.getByRole("button", { name: "PING", exact: true }).click()
  await page.getByRole("button", { name: "TTL visitor", exact: true }).click()
  await expect(output(page)).toContainText("(integer) -2")
  const text = await output(page).innerText()
  expect(text.indexOf("PONG")).toBeGreaterThan(-1)
  expect(text.indexOf("PONG")).toBeLessThan(text.indexOf("(integer) -2"))
})

test("blocked wasm keeps the recorded session", async ({ page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("Failed to load resource")) errors.push(message.text())
  })
  await page.route("**/*.wasm", (route) => route.abort())
  await page.goto("/")
  await expect(status(page)).toContainText("unavailable")
  await expect(output(page)).toContainText("(integer) 30")
  expect(errors).toEqual([])
})

test("long output wraps at 375px", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "narrow screens only")
  await openReady(page)
  await runCommand(page, `SET long ${"x".repeat(300)}`)
  await runCommand(page, "GET long")
  await expect(output(page)).toContainText("xxxxxxxxxx")
  const scrollWidth = await page.evaluate(() => document.scrollingElement!.scrollWidth)
  expect(scrollWidth).toBeLessThanOrEqual(375)
})

test("AOF panel shows writes only", async ({ page }) => {
  await openReady(page)
  await runCommand(page, "SET a 1")
  await expect(aofPanel(page).getByRole("listitem")).toHaveCount(1)
  await expect(aofPanel(page)).toContainText("SET a 1")
  await runCommand(page, "GET a")
  await expect(output(page)).toContainText('"1"')
  await expect(aofPanel(page).getByRole("listitem")).toHaveCount(1)
})

test("no wasm before load", async ({ page }) => {
  await openReady(page)
  const timing = await page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming
    const wasm = performance.getEntriesByType("resource").filter((entry) => entry.name.endsWith(".wasm"))
    return { loadEventStart: navigation.loadEventStart, wasmStarts: wasm.map((entry) => entry.startTime) }
  })
  expect(timing.wasmStarts.length).toBeGreaterThan(0)
  for (const start of timing.wasmStarts) expect(start).toBeGreaterThanOrEqual(timing.loadEventStart)
})
