// Mirrors the Go structs in wasm/gateway/gateway/sim.go (JSON keys are the Go field names).
export type BackendName = "A" | "B"
export type BreakerState = "closed" | "open" | "half-open"
export type Priority = 0 | 1 | 2 // premium, default, batch

export type SimConfig = {
  QueueCapacity: number
  Workers: number
  LatencyMs: number
  CooldownMs: number
  HealthCheckMs: number
}

export type BackendSnapshot = {
  Name: BackendName
  Weight: number
  CurrentWeight: number
  FailureCounter: number
  Served: number
  Failed: number
  State: BreakerState
  PromoteAtMs: number
}

export type SimEvent = {
  ID: number
  Backend: BackendName | ""
  Outcome: "ok" | "failed" | "rate_limited" | "shed" | "no_backend"
  Priority: Priority
  AtMs: number
}

export type SimSnapshot = {
  Backends: BackendSnapshot[]
  QueueDepth: number
  RateLimited: number
  Shed: [number, number, number]
  Events: SimEvent[]
  NowMs: number
}

export type SubmitResult = "accepted" | "rate_limited" | "shed"

export interface GatewaySim {
  start(config: SimConfig): void
  submit(key: string, priority: Priority, cost: number): SubmitResult
  setHealthy(backend: BackendName, healthy: boolean): void
  skipCooldown(): void
  snapshot(): SimSnapshot
  stop(): void
}
