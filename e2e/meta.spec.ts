import { expect, test } from "@playwright/test"

for (const path of ["/opengraph-image", "/icon", "/apple-icon", "/robots.txt", "/sitemap.xml"]) {
  test(`${path} responds`, async ({ request }) => {
    const response = await request.get(path)
    expect(response.status()).toBe(200)
  })
}

test("describes the person in JSON-LD", async ({ page }) => {
  await page.goto("/")
  const json = await page.locator('script[type="application/ld+json"]').textContent()
  const person = JSON.parse(json ?? "{}")
  expect(person["@type"]).toBe("Person")
  expect(person.name).toBe("Sree Vardhan Reddy")
})
