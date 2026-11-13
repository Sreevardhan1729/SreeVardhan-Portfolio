import { formatReply } from "./format"
import type { ForgeModule } from "./loader"
import { decodeReply, decodeStream, encodeCommand } from "./resp"
import { tokenize } from "./tokenize"

export type ForgeStatus = "idle" | "loading" | "ready" | "unavailable"
export type RunResult = { lines: string[]; clear?: true }

const MAX_LINE_BYTES = 1024
const SWEEP_INTERVAL_MS = 1000 // ForgeDB's server runs its expiry sweep every second
const PUB_SUB = new Set(["PUBLISH", "SUBSCRIBE", "UNSUBSCRIBE"])
const encoder = new TextEncoder()

function asCommandLine(args: string[]): string {
  return args.map((arg) => (arg === "" || /[\s"'\\]/.test(arg) ? JSON.stringify(arg) : arg)).join(" ")
}

// One browser "connection" to ForgeDB: commands run one at a time, in the order they were sent,
// including any sent while the module is still loading.
export class ForgeSession {
  private status: ForgeStatus = "idle"
  private module: ForgeModule | null = null
  private loading: Promise<void> | null = null
  private queue: Promise<unknown> = Promise.resolve()
  private sweepTimer: ReturnType<typeof setInterval> | null = null
  private statusListeners = new Set<(status: ForgeStatus) => void>()
  private aofListeners = new Set<(entries: string[]) => void>()

  constructor(
    private readonly load: () => Promise<ForgeModule>,
    private readonly commands: string[],
  ) {}

  start(): Promise<void> {
    this.loading ??= (async () => {
      this.setStatus("loading")
      try {
        this.module = await this.load()
        this.sweepTimer = setInterval(() => this.module?.sweep(), SWEEP_INTERVAL_MS)
        this.setStatus("ready")
      } catch {
        this.setStatus("unavailable")
      }
    })()
    return this.loading
  }

  run(line: string): Promise<RunResult> {
    const result = this.queue.then(() => this.runNow(line))
    this.queue = result.catch(() => undefined)
    return result
  }

  onStatus(listener: (status: ForgeStatus) => void): () => void {
    this.statusListeners.add(listener)
    return () => this.statusListeners.delete(listener)
  }

  onAof(listener: (entries: string[]) => void): () => void {
    this.aofListeners.add(listener)
    return () => this.aofListeners.delete(listener)
  }

  dispose(): void {
    if (this.sweepTimer) clearInterval(this.sweepTimer)
    this.sweepTimer = null
    this.statusListeners.clear()
    this.aofListeners.clear()
  }

  private setStatus(status: ForgeStatus) {
    this.status = status
    for (const listener of this.statusListeners) listener(status)
  }

  private async runNow(line: string): Promise<RunResult> {
    if (encoder.encode(line).length > MAX_LINE_BYTES) {
      return { lines: [`(error) ERR line too long (max ${MAX_LINE_BYTES} bytes)`] }
    }
    const parsed = tokenize(line)
    if (!parsed.ok) return { lines: [parsed.error] }
    if (parsed.args.length === 0) return { lines: [] }

    const name = parsed.args[0].toUpperCase()
    if (name === "CLEAR" && parsed.args.length === 1) return { lines: [], clear: true }
    if (name === "HELP" && parsed.args.length === 1) return { lines: this.helpLines() }

    await this.start()
    if (this.status !== "ready" || !this.module) return { lines: ["(error) live demo unavailable"] }

    let reply: Uint8Array
    try {
      reply = this.module.exec(encodeCommand(parsed.args))
    } catch {
      try {
        this.module = await this.load()
      } catch {
        this.module = null
        this.setStatus("unavailable")
      }
      return { lines: ["(error) ForgeDB crashed and restarted, so its data was reset"] }
    }
    this.publishAof()
    return { lines: formatReply(decodeReply(reply)) }
  }

  private publishAof() {
    const entries = decodeStream(this.module!.drainAof()).map((value) =>
      value.type === "array" && value.items
        ? asCommandLine(value.items.map((item) => (item.type === "bulk" ? (item.value ?? "") : "")))
        : "",
    )
    if (entries.length === 0) return
    for (const listener of this.aofListeners) listener(entries)
  }

  private helpLines(): string[] {
    const usable = this.commands.filter((name) => !PUB_SUB.has(name))
    const width = String(usable.length).length
    return [
      "ForgeDB commands in this build:",
      ...usable.map((name, index) => `${String(index + 1).padStart(width)}) ${name}`),
      "Pub/Sub is off in the browser. CLEAR clears the screen.",
    ]
  }
}
