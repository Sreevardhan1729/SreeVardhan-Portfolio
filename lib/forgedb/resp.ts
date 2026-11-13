export type RespValue =
  | { type: "simple"; value: string }
  | { type: "error"; value: string }
  | { type: "integer"; value: number }
  | { type: "bulk"; value: string | null }
  | { type: "array"; items: RespValue[] | null }

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const CR = 13

// Lengths in RESP are byte counts, so everything is measured after UTF-8 encoding.
export function encodeCommand(args: string[]): Uint8Array {
  const parts = args.map((arg) => encoder.encode(arg))
  const chunks: Uint8Array[] = [encoder.encode(`*${parts.length}\r\n`)]
  for (const part of parts) chunks.push(encoder.encode(`$${part.length}\r\n`), part, encoder.encode("\r\n"))
  const out = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0))
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

function readLine(bytes: Uint8Array, pos: number): { line: string; next: number } {
  let end = pos
  while (end < bytes.length && bytes[end] !== CR) end++
  if (end >= bytes.length) throw new Error("incomplete RESP line")
  return { line: decoder.decode(bytes.subarray(pos, end)), next: end + 2 }
}

function readValue(bytes: Uint8Array, pos: number): { value: RespValue; next: number } {
  const kind = String.fromCharCode(bytes[pos])
  const { line, next } = readLine(bytes, pos + 1)
  switch (kind) {
    case "+":
      return { value: { type: "simple", value: line }, next }
    case "-":
      return { value: { type: "error", value: line }, next }
    case ":":
      return { value: { type: "integer", value: Number(line) }, next }
    case "$": {
      const length = Number(line)
      if (length < 0) return { value: { type: "bulk", value: null }, next }
      const value = decoder.decode(bytes.subarray(next, next + length))
      return { value: { type: "bulk", value }, next: next + length + 2 }
    }
    case "*": {
      const count = Number(line)
      if (count < 0) return { value: { type: "array", items: null }, next }
      const items: RespValue[] = []
      let cursor = next
      for (let i = 0; i < count; i++) {
        const item = readValue(bytes, cursor)
        items.push(item.value)
        cursor = item.next
      }
      return { value: { type: "array", items }, next: cursor }
    }
    default:
      throw new Error(`unknown RESP type byte: ${kind}`)
  }
}

export function decodeReply(bytes: Uint8Array): RespValue {
  return readValue(bytes, 0).value
}

export function decodeStream(bytes: Uint8Array): RespValue[] {
  const values: RespValue[] = []
  let pos = 0
  while (pos < bytes.length) {
    const { value, next } = readValue(bytes, pos)
    values.push(value)
    pos = next
  }
  return values
}
