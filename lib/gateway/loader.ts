import type { GatewaySim, SimSnapshot } from "./types"

type RawSim = {
  start(config: string): string | null
  submit(key: string, priority: number, cost: number): string
  setHealthy(backend: string, healthy: boolean): void
  skipCooldown(): void
  snapshot(): string
  stop(): void
}

declare global {
  // Defined by TinyGo's wasm_exec.js and by the module itself.
  var Go: new () => { importObject: WebAssembly.Imports; run(instance: WebAssembly.Instance): Promise<void> }
  var gatewaySim: RawSim | undefined
}

let loading: Promise<GatewaySim> | null = null

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`could not load ${src}`))
    document.head.appendChild(script)
  })
}

async function instantiate(url: string, imports: WebAssembly.Imports): Promise<WebAssembly.Instance> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`could not load ${url}: ${response.status}`)
  if (WebAssembly.instantiateStreaming && response.headers.get("content-type")?.includes("application/wasm")) {
    return (await WebAssembly.instantiateStreaming(response, imports)).instance
  }
  return (await WebAssembly.instantiate(await response.arrayBuffer(), imports)).instance
}

// Loads the TinyGo module once per page and wraps globalThis.gatewaySim with typed methods.
export function loadGatewaySim(): Promise<GatewaySim> {
  loading ??= (async () => {
    await loadScript("/wasm/gateway-wasm-exec.js")
    const go = new globalThis.Go()
    const instance = await instantiate("/wasm/gateway.wasm", go.importObject)
    void go.run(instance) // never resolves: main() blocks to keep the simulation alive
    const raw = globalThis.gatewaySim
    if (!raw) throw new Error("gateway module did not register gatewaySim")
    return {
      start: (config) => {
        const error = raw.start(JSON.stringify(config))
        if (error) throw new Error(error)
      },
      submit: (key, priority, cost) => raw.submit(key, priority, cost) as ReturnType<GatewaySim["submit"]>,
      setHealthy: (backend, healthy) => raw.setHealthy(backend, healthy),
      skipCooldown: () => raw.skipCooldown(),
      snapshot: () => {
        const snapshot = JSON.parse(raw.snapshot()) as SimSnapshot
        snapshot.Events ??= []
        return snapshot
      },
      stop: () => raw.stop(),
    }
  })()
  loading.catch(() => {
    loading = null
  })
  return loading
}
