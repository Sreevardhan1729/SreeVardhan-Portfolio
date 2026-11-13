import type { RespValue } from "./resp"

const named: Record<string, string> = { "\\": "\\\\", '"': '\\"', "\n": "\\n", "\r": "\\r", "\t": "\\t", "\x07": "\\a", "\b": "\\b" }

// Quotes like redis-cli, but keeps printable non-ASCII text readable instead of \x escapes.
function quote(value: string): string {
  let out = '"'
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0
    if (named[ch]) out += named[ch]
    else if (code < 0x20 || code === 0x7f) out += `\\x${code.toString(16).padStart(2, "0")}`
    else out += ch
  }
  return out + '"'
}

export function formatReply(value: RespValue): string[] {
  switch (value.type) {
    case "simple":
      return [value.value]
    case "error":
      return [`(error) ${value.value}`]
    case "integer":
      return [`(integer) ${value.value}`]
    case "bulk":
      return [value.value === null ? "(nil)" : quote(value.value)]
    case "array": {
      if (value.items === null) return ["(nil)"]
      if (value.items.length === 0) return ["(empty array)"]
      const width = String(value.items.length).length
      return value.items.flatMap((item, index) => {
        const prefix = `${String(index + 1).padStart(width)}) `
        const [first, ...rest] = formatReply(item)
        return [prefix + first, ...rest.map((line) => " ".repeat(prefix.length) + line)]
      })
    }
  }
}
