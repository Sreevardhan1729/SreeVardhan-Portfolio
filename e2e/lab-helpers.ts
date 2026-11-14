import type { Page } from "@playwright/test"

export const sim = (page: Page) => page.locator("#gateway-sim")
export const labTab = (page: Page, name: "ForgeDB" | "Gateway") =>
  page.getByRole("tablist", { name: "Live demos" }).getByRole("tab", { name, exact: true })

// Wide screens switch the hero window with its tab; phones stack the gateway under the terminal.
export async function showGateway(page: Page) {
  if (await labTab(page, "Gateway").isVisible()) await labTab(page, "Gateway").click()
  else await sim(page).scrollIntoViewIfNeeded()
}
