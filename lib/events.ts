// Page-wide events that let the command menu drive the live demos without importing them.
export const FORGEDB_RUN_EVENT = "forgedb:run" // detail: { command: string }
export const GATEWAY_FAIL_EVENT = "gateway:fail" // detail: { backend: "A" | "B" }

export type ForgeRunDetail = { command: string }
export type GatewayFailDetail = { backend: "A" | "B" }

export function runInForgeDB(command: string): void {
  window.dispatchEvent(new CustomEvent<ForgeRunDetail>(FORGEDB_RUN_EVENT, { detail: { command } }))
}

export function failBackend(backend: "A" | "B"): void {
  window.dispatchEvent(new CustomEvent<GatewayFailDetail>(GATEWAY_FAIL_EVENT, { detail: { backend } }))
}
