import type { Period } from "./portfolio-data"

const DAY_MS = 86_400_000
const MIN_WIDTH_PCT = 1.5
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

const hasDay = (date: string) => date.length === 10

function parse(date: string, edge: "start" | "end"): Date {
  const [year, month, day] = date.split("-").map(Number)
  if (day) return new Date(Date.UTC(year, month - 1, day))
  return edge === "start" ? new Date(Date.UTC(year, month - 1, 1)) : new Date(Date.UTC(year, month, 0))
}

// Both bounds are calendar days; a month-only end means the month's last day.
export function periodBounds(period: Period): { start: Date; end: Date } {
  return { start: parse(period.start, "start"), end: parse(period.end, "end") }
}

const round = (value: number) => Math.round(value * 100) / 100

// Where a span sits on the root's axis, in percent. Ends are inclusive, so a one-day span still has width.
export function spanPosition(period: Period, root: Period): { leftPct: number; widthPct: number } {
  const bounds = periodBounds(root)
  const rootStart = bounds.start.getTime()
  const rootEnd = bounds.end.getTime() + DAY_MS
  const total = rootEnd - rootStart
  const span = periodBounds(period)
  const start = Math.min(Math.max(span.start.getTime(), rootStart), rootEnd)
  const end = Math.min(Math.max(span.end.getTime() + DAY_MS, start), rootEnd)
  const widthPct = Math.max(((end - start) / total) * 100, MIN_WIDTH_PCT)
  const leftPct = Math.min(((start - rootStart) / total) * 100, 100 - widthPct)
  return { leftPct: round(leftPct), widthPct: round(widthPct) }
}

export function formatPeriod(period: Period): string {
  const { start, end } = periodBounds(period)
  const label = (date: Date, withDay: boolean) =>
    `${withDay ? `${date.getUTCDate()} ` : ""}${MONTHS[date.getUTCMonth()]}`
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear()
  const first = label(start, hasDay(period.start)) + (sameYear ? "" : ` ${start.getUTCFullYear()}`)
  return `${first} – ${label(end, hasDay(period.end))} ${end.getUTCFullYear()}`
}

// One label per calendar month covered by the root period.
export function axisMonths(root: Period): string[] {
  const { start, end } = periodBounds(root)
  const months: string[] = []
  const cursor = new Date(start)
  while (cursor <= end) {
    months.push(MONTHS[cursor.getUTCMonth()])
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }
  return months
}
