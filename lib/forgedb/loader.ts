export interface ForgeModule {
  exec(request: Uint8Array): Uint8Array
  sweep(): void
  drainAof(): Uint8Array
}

type RawModule = {
  _malloc(size: number): number
  _free(ptr: number): void
  _forgedb_exec(ptr: number, len: number): number
  _forgedb_reply_len(): number
  _forgedb_sweep(): void
  _forgedb_aof_drain(): number
  _forgedb_aof_len(): number
  HEAPU8: Uint8Array
}

// The module is served from public/ and loaded at runtime, so the bundler must leave the import alone.
export async function loadForgeModule(url = "/wasm/forgedb.mjs"): Promise<ForgeModule> {
  const { default: factory } = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url)
  const m: RawModule = await factory()
  return {
    exec(request) {
      const ptr = m._malloc(request.length)
      m.HEAPU8.set(request, ptr)
      const out = m._forgedb_exec(ptr, request.length)
      m._free(ptr)
      return m.HEAPU8.slice(out, out + m._forgedb_reply_len())
    },
    sweep() {
      m._forgedb_sweep()
    },
    drainAof() {
      const out = m._forgedb_aof_drain()
      return m.HEAPU8.slice(out, out + m._forgedb_aof_len())
    },
  }
}
