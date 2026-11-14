// Page-wide events that let the command menu and page links drive the live demos without importing them.
export const FORGEDB_RUN_EVENT = "forgedb:run" // detail: { command: string }
export const GATEWAY_FAIL_EVENT = "gateway:fail" // detail: { backend: "A" | "B" }
export const GATEWAY_BURST_EVENT = "gateway:burst"
export const LAB_SHOW_EVENT = "lab:show" // detail: { tab: LabTab }

// The tabs of the live-demo window in the hero.
export type LabTab = "forgedb" | "gateway"

export type ForgeRunDetail = { command: string }
export type GatewayFailDetail = { backend: "A" | "B" }
export type LabShowDetail = { tab: LabTab }

export function runInForgeDB(command: string): void {
  window.dispatchEvent(new CustomEvent<ForgeRunDetail>(FORGEDB_RUN_EVENT, { detail: { command } }))
}

export function failBackend(backend: "A" | "B"): void {
  window.dispatchEvent(new CustomEvent<GatewayFailDetail>(GATEWAY_FAIL_EVENT, { detail: { backend } }))
}

export function burstOneKey(): void {
  window.dispatchEvent(new Event(GATEWAY_BURST_EVENT))
}

export function showDemo(tab: LabTab): void {
  window.dispatchEvent(new CustomEvent<LabShowDetail>(LAB_SHOW_EVENT, { detail: { tab } }))
}
