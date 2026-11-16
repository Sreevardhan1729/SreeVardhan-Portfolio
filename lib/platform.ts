// Apple keyboards use ⌘ for shortcuts; Windows, Linux and ChromeOS use Ctrl.
const APPLE = /Mac|iPhone|iPad|iPod/i

export function isApplePlatform(platform: string): boolean {
  return APPLE.test(platform)
}

// Inlined into the page so it runs before the first paint: it marks <html> with data-os, and CSS shows the shortcut
// label for that platform, so the label never flips after the page has drawn.
export const PLATFORM_SCRIPT = `document.documentElement.dataset.os=${APPLE}.test((navigator.userAgentData&&navigator.userAgentData.platform)||navigator.platform||"")?"apple":"other"`
