import type { SimConfig } from "./types"

// Demo scale: small enough to overload at a few requests per second. The breaker timings are the gateway's own.
export const CONFIG: SimConfig = { QueueCapacity: 20, Workers: 4, LatencyMs: 150, CooldownMs: 30_000, HealthCheckMs: 10_000 }
