type KeyLike = Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey" | "isComposing" | "defaultPrevented">

// The character a keystroke should add to the terminal prompt, or null to leave it to the page.
// Space stays with the browser, where it scrolls the page.
export function capturedKey(event: KeyLike, nothingFocused: boolean): string | null {
  if (!nothingFocused || event.defaultPrevented || event.isComposing) return null
  if (event.ctrlKey || event.metaKey || event.altKey) return null
  if (event.key.length !== 1 || event.key === " ") return null
  return event.key
}
