import { expect, type Page, test } from "@playwright/test"
import { showGateway, sim } from "./lab-helpers"

const LIGHT_PANEL = "rgb(255, 255, 255)"
const DARK_PANEL = "rgb(15, 17, 14)"

// The canvas draws its dot grid in the panel rule colour; the first grid dot sits at 12,12.
const gridDot = (page: Page) =>
  sim(page)
    .locator("canvas")
    .evaluate((canvas: HTMLCanvasElement) => {
      const at = Math.round(12 * (canvas.width / canvas.getBoundingClientRect().width))
      return Array.from(canvas.getContext("2d")!.getImageData(at, at, 1, 1).data.slice(0, 3)).join(",")
    })

for (const [scheme, panel] of [
  ["light", LIGHT_PANEL],
  ["dark", DARK_PANEL],
] as const) {
  test(`the demo panels are ${scheme} on a ${scheme} page`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme })
    await page.goto("/")
    await expect(page.locator("#lab")).toHaveCSS("background-color", panel)
    await expect(page.locator("#experience .panel").first()).toHaveCSS("background-color", panel)
  })
}

test("the theme toggle repaints the panels and the gateway canvas", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" })
  await page.goto("/")
  await showGateway(page)
  await expect(sim(page)).toHaveAttribute("data-status", "ready", { timeout: 15_000 })
  await expect.poll(() => gridDot(page)).toBe("228,225,217")
  await page.getByRole("button", { name: "Switch to dark theme" }).click()
  await expect(page.locator("#lab")).toHaveCSS("background-color", DARK_PANEL)
  await expect.poll(() => gridDot(page)).toBe("38,42,35")
})
