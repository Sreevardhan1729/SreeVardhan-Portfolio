import { chromium } from "@playwright/test"
const [url, out, w, h, scheme, selector] = process.argv.slice(2)
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) }, colorScheme: scheme, deviceScaleFactor: 2 })
await page.goto(url)
if (selector) {
  await page.locator(selector).scrollIntoViewIfNeeded()
  await page.waitForTimeout(4000)
  await page.locator(selector).screenshot({ path: out })
} else {
  await page.waitForTimeout(1500)
  await page.screenshot({ path: out, fullPage: true })
}
await browser.close()
