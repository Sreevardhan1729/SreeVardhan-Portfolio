export type TokenizeResult = { ok: true; args: string[] } | { ok: false; error: string }

const invalid: TokenizeResult = { ok: false, error: "Invalid argument(s)" }
const isSpace = (ch: string | undefined) => ch === " " || ch === "\n" || ch === "\r" || ch === "\t"
const escapes: Record<string, string> = { n: "\n", r: "\r", t: "\t", b: "\b", a: "\x07" }
const isHex = (ch: string | undefined) => ch !== undefined && /[0-9a-fA-F]/.test(ch)

// Splits a command line the way redis-cli does (its sdssplitargs rules).
export function tokenize(line: string): TokenizeResult {
  const args: string[] = []
  let i = 0
  while (true) {
    while (isSpace(line[i])) i++
    if (i >= line.length) return { ok: true, args }

    let current = ""
    let inDouble = false
    let inSingle = false
    let done = false
    while (!done) {
      const ch = line[i]
      if (inDouble) {
        if (ch === undefined) return invalid
        if (ch === "\\" && line[i + 1] === "x" && isHex(line[i + 2]) && isHex(line[i + 3])) {
          current += String.fromCharCode(parseInt(line.slice(i + 2, i + 4), 16))
          i += 3
        } else if (ch === "\\" && line[i + 1] !== undefined) {
          i++
          current += escapes[line[i]] ?? line[i]
        } else if (ch === '"') {
          if (line[i + 1] !== undefined && !isSpace(line[i + 1])) return invalid
          done = true
        } else {
          current += ch
        }
      } else if (inSingle) {
        if (ch === undefined) return invalid
        if (ch === "\\" && line[i + 1] === "'") {
          i++
          current += "'"
        } else if (ch === "'") {
          if (line[i + 1] !== undefined && !isSpace(line[i + 1])) return invalid
          done = true
        } else {
          current += ch
        }
      } else if (ch === undefined || isSpace(ch)) {
        done = true
      } else if (ch === '"') {
        inDouble = true
      } else if (ch === "'") {
        inSingle = true
      } else {
        current += ch
      }
      if (ch !== undefined) i++
    }
    args.push(current)
  }
}
