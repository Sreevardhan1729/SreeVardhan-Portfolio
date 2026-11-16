import { describe, expect, it } from "vitest"
import { isApplePlatform } from "@/lib/platform"

describe("isApplePlatform", () => {
  it.each(["macOS", "MacIntel", "iPhone", "iPad"])("treats %s as Apple, where the shortcut is ⌘K", (platform) => {
    expect(isApplePlatform(platform)).toBe(true)
  })

  it.each(["Windows", "Win32", "Linux x86_64", "Chrome OS", "Android", ""])(
    "treats %s as a Ctrl+K platform",
    (platform) => {
      expect(isApplePlatform(platform)).toBe(false)
    },
  )
})
