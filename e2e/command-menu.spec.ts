import { expect, type Page, test } from "@playwright/test"

const trigger = (page: Page) => page.getByRole("button", { name: "Open command menu" })
const dialog = (page: Page) => page.getByRole("dialog", { name: "Command menu" })
const menuInput = (page: Page) => dialog(page).getByRole("combobox")

async function chooseAction(page: Page, query: string) {
  await trigger(page).click()
  await expect(dialog(page)).toBeVisible()
  await menuInput(page).fill(query)
  await menuInput(page).press("Enter")
  await expect(dialog(page)).toBeHidden()
}

test("Ctrl+K opens the command menu", async ({ page }) => {
  await page.goto("/")
  // The theme toggle renders its icon only after hydration, when the shortcut listener is attached.
  await expect(page.getByRole("button", { name: /Switch to (light|dark) theme/ })).toBeVisible()
  await page.keyboard.press("Control+k")
  await expect(dialog(page)).toBeVisible()
})

for (const { os, platform, label, keys, press } of [
  { os: "macOS", platform: "MacIntel", label: "⌘K", keys: "Meta+K", press: "Meta+k" },
  { os: "Windows", platform: "Win32", label: "Ctrl+K", keys: "Control+K", press: "Control+k" },
]) {
  test(`on ${os} the menu button shows ${label}, and that shortcut opens it`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "phones show Menu instead of a shortcut")
    await page.addInitScript(
      ({ platform, os }) => {
        Object.defineProperty(navigator, "platform", { get: () => platform, configurable: true })
        Object.defineProperty(navigator, "userAgentData", { get: () => ({ platform: os }), configurable: true })
      },
      { platform, os },
    )
    await page.goto("/")
    await expect(trigger(page)).toHaveText(label, { useInnerText: true })
    await expect(trigger(page)).toHaveAttribute("aria-keyshortcuts", keys)
    await expect(page.getByRole("button", { name: /Switch to (light|dark) theme/ })).toBeVisible()
    await page.keyboard.press(press)
    await expect(dialog(page)).toBeVisible()
  })
}

test("typing a section name jumps to it", async ({ page }) => {
  await page.goto("/")
  await chooseAction(page, "contact")
  await expect(page.locator("#contact-heading")).toBeInViewport()
})

test("Run in ForgeDB: PING runs it in the terminal", async ({ page }) => {
  await page.goto("/")
  await chooseAction(page, "Run in ForgeDB: PING")
  await expect(page.getByRole("log", { name: "ForgeDB output" })).toContainText("PONG")
})

test("Fail backend B opens its breaker", async ({ page }) => {
  await page.goto("/")
  await chooseAction(page, "Fail backend B")
  await expect(page.getByTestId("breaker-B")).toContainText("open", { timeout: 15_000 })
})

test("Escape closes the menu and returns focus to the trigger", async ({ page }) => {
  await page.goto("/")
  await trigger(page).click()
  await expect(dialog(page)).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(dialog(page)).toBeHidden()
  await expect(trigger(page)).toBeFocused()
})

test("the trigger is labelled Menu on small screens", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "narrow screens only")
  await page.goto("/")
  await expect(trigger(page)).toBeVisible()
  await expect(trigger(page)).toContainText("Menu")
})
