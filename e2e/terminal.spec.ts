import { expect, type Page, test } from "@playwright/test"

const status = (page: Page) => page.locator("#forgedb-terminal [data-testid=forgedb-status]")
const output = (page: Page) => page.getByRole("log", { name: "ForgeDB output" })
const input = (page: Page) => page.getByLabel("ForgeDB command")
const aofPanel = (page: Page) => page.getByRole("region", { name: "Append-only log" })

async function runCommand(page: Page, command: string) {
  await input(page).fill(command)
  await input(page).press("Enter")
}

// Focusing the prompt counts as using the terminal, so the self-typing intro steps aside.
async function openReady(page: Page) {
  await page.goto("/")
  await input(page).focus()
  await expect(status(page)).toContainText("live")
  await expect(page.locator("#forgedb-terminal")).toHaveAttribute("data-intro", "skipped")
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
  // TTL depends on the SET before it: run in order it reports ~30 seconds, reversed it would be -2.
  await page.getByRole("button", { name: 'SET visitor "hello" EX 30', exact: true }).click()
  await page.getByRole("button", { name: "TTL visitor", exact: true }).click()
  await expect(status(page)).toContainText("live")
  const live = output(page).locator("div", { hasText: /^\(integer\) / })
  await expect(live).toHaveText([/\(integer\) (29|30)/])
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

test("types a short live demo when left alone", async ({ page }) => {
  await page.goto("/")
  const terminal = page.locator("#forgedb-terminal")
  // The demo waits until the terminal is on screen (below the fold on phones).
  await terminal.scrollIntoViewIfNeeded()
  await expect(terminal).toHaveAttribute("data-intro", "done", { timeout: 15_000 })
  await expect(output(page)).toContainText("PONG")
  await expect(output(page).locator("div", { hasText: /^\(integer\) / })).toHaveText([/\(integer\) (29|30)/])
  await expect(input(page)).toHaveValue("")
  await expect(output(page)).toContainText("# your turn")
})

test("clicking the terminal before it is live skips the demo", async ({ page }) => {
  await page.goto("/")
  await page.locator("#forgedb-terminal").click()
  await expect(status(page)).toContainText("live")
  await expect(page.locator("#forgedb-terminal")).toHaveAttribute("data-intro", "skipped")
  await page.waitForTimeout(1500)
  await expect(output(page)).not.toContainText("PONG")
})

test("the demo runs without typing animation under reduced motion", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" })
  const page = await context.newPage()
  await page.goto("http://localhost:3100/")
  await page.locator("#forgedb-terminal").scrollIntoViewIfNeeded()
  await expect(page.locator("#forgedb-terminal")).toHaveAttribute("data-intro", "done", { timeout: 15_000 })
  await expect(output(page)).toContainText("PONG")
  await context.close()
})

test("typing anywhere on the page goes to the prompt", async ({ page }) => {
  await page.goto("/")
  // Keys go to the prompt only while the terminal is mostly on screen; phones scroll there smoothly.
  await page.locator("#forgedb-terminal").scrollIntoViewIfNeeded()
  await expect(page.locator("#forgedb-terminal")).toBeInViewport({ ratio: 0.5 })
  await expect(status(page)).toContainText("live")
  await page.keyboard.type('SET typed "yes"')
  await expect(input(page)).toBeFocused()
  await expect(input(page)).toHaveValue('SET typed "yes"')
  await page.keyboard.press("Enter")
  await page.keyboard.type("GET typed")
  await page.keyboard.press("Enter")
  await expect(output(page)).toContainText('"yes"')
})

test("typing while a link has focus leaves the prompt alone", async ({ page }) => {
  await page.goto("/")
  await expect(status(page)).toContainText("live")
  await page.getByTestId("hero-actions").getByRole("link", { name: "Resume" }).focus()
  await page.keyboard.type("x")
  await expect(input(page)).toHaveValue("")
  await expect(input(page)).not.toBeFocused()
})

test("typing over the demo replaces what it was typing", async ({ page }) => {
  await page.goto("/")
  const terminal = page.locator("#forgedb-terminal")
  await terminal.scrollIntoViewIfNeeded()
  await expect(terminal).toHaveAttribute("data-intro", "running", { timeout: 15_000 })
  await page.keyboard.type("GET visitor")
  await expect(terminal).toHaveAttribute("data-intro", "skipped")
  await expect(input(page)).toHaveValue("GET visitor")
  await page.waitForTimeout(800)
  await expect(input(page)).toHaveValue("GET visitor")
})

test("shows a blinking cursor at the prompt until it is focused", async ({ page }) => {
  await page.goto("/")
  const cursor = page.getByTestId("prompt-cursor")
  await expect(cursor).toBeVisible()
  await input(page).focus()
  await expect(cursor).toBeHidden()
})
