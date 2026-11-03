// ---------------------------------------------------------------------------
// Business-timezone date helpers
//
// Appointments are stored as UTC instants, but a spa thinks in its own wall
// clock: "Tuesday 2:30 PM in Austin". Everything that buckets by day, draws a
// calendar or checks working hours goes through these helpers with the
// location's IANA timezone, so results are the same on the server and in any
// visitor's browser.
//
// A "date key" is a calendar date string, "yyyy-MM-dd", with no timezone.
// A "time" is a wall-clock string, "HH:mm" (24h).
// ---------------------------------------------------------------------------

export type DateKey = string

export interface ZonedParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  /** 0 = Sunday ... 6 = Saturday */
  weekday: number
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const partsFormatters = new Map<string, Intl.DateTimeFormat>()

function partsFormatter(timeZone: string) {
  let f = partsFormatters.get(timeZone)
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
    partsFormatters.set(timeZone, f)
  }
  return f
}

/** Wall-clock parts of an instant in `timeZone`. */
export function zonedParts(input: Date | string | number, timeZone: string): ZonedParts {
  const parts = partsFormatter(timeZone).formatToParts(new Date(input))
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "0"
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")) % 24,
    minute: Number(get("minute")),
    second: Number(get("second")),
    weekday: WEEKDAYS.indexOf(get("weekday")),
  }
}

const pad = (n: number) => String(n).padStart(2, "0")

/** Calendar date of an instant in `timeZone`, e.g. "2026-11-03". */
export function dateKeyInZone(input: Date | string | number, timeZone: string): DateKey {
  const p = zonedParts(input, timeZone)
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`
}

/** Minutes since local midnight of an instant in `timeZone`. */
export function minutesInZone(input: Date | string | number, timeZone: string): number {
  const p = zonedParts(input, timeZone)
  return p.hour * 60 + p.minute
}

function offsetMs(instant: number, timeZone: string): number {
  const p = zonedParts(instant, timeZone)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return asUtc - Math.floor(instant / 1000) * 1000
}

/** The UTC instant for a wall-clock date and time in `timeZone`. */
export function zonedTimeToUtc(dateKey: DateKey, time: string, timeZone: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number)
  const [hh, mm] = time.split(":").map(Number)
  const guess = Date.UTC(y, m - 1, d, hh, mm)
  const first = offsetMs(guess, timeZone)
  let result = guess - first
  // Second pass settles times near a daylight-saving change
  const second = offsetMs(result, timeZone)
  if (second !== first) result = guess - second
  return new Date(result)
}

function keyToUtcDate(key: DateKey): Date {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export function addDays(key: DateKey, days: number): DateKey {
  const date = keyToUtcDate(key)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** 0 = Sunday ... 6 = Saturday */
export function weekdayOf(key: DateKey): number {
  return keyToUtcDate(key).getUTCDay()
}

/** Monday of the week containing `key`. */
export function startOfWeek(key: DateKey): DateKey {
  return addDays(key, -((weekdayOf(key) + 6) % 7))
}

export function startOfMonth(key: DateKey): DateKey {
  return `${key.slice(0, 7)}-01`
}

/** Same day-of-month one month earlier, clamped to the month's length. */
export function sameDayLastMonth(key: DateKey): DateKey {
  const [y, m, d] = key.split("-").map(Number)
  const lastDay = new Date(Date.UTC(y, m - 1, 0)).getUTCDate()
  const prev = new Date(Date.UTC(y, m - 2, Math.min(d, lastDay)))
  return prev.toISOString().slice(0, 10)
}

/** First day of the month `months` before the month of `key`. */
export function monthsBefore(key: DateKey, months: number): DateKey {
  const [y, m] = key.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1 - months, 1)).toISOString().slice(0, 10)
}

/** Whole days from `a` to `b` (positive when `b` is later). */
export function daysBetween(a: DateKey, b: DateKey): number {
  return Math.round((keyToUtcDate(b).getTime() - keyToUtcDate(a).getTime()) / 86_400_000)
}

export function isDateKey(value: unknown): value is DateKey {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(keyToUtcDate(value).getTime())
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

export function minutesToTime(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
}

/** "2:30 PM" */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h % 12 || 12}:${pad(m)} ${h >= 12 ? "PM" : "AM"}`
}

/** Formats a date key without any timezone shift, e.g. "Tue, Nov 3". */
export function formatDateKey(key: DateKey, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(keyToUtcDate(key))
}

/** "2026-11" -> "Nov '26" (short) or "November 2026" (long) */
export function formatMonth(month: string, style: "short" | "long"): string {
  const key = `${month.slice(0, 7)}-01`
  if (style === "long") return formatDateKey(key, { month: "long", year: "numeric" })
  return `${formatDateKey(key, { month: "short" })} '${month.slice(2, 4)}`
}

/** Formats an instant as seen on the wall clock in `timeZone`. */
export function formatInZone(
  input: Date | string | number,
  timeZone: string,
  options: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone }).format(new Date(input))
}

/** "Nov 3, 2026, 2:30 PM" in the business timezone. */
export function formatDateTimeInZone(input: Date | string | number, timeZone: string): string {
  return formatInZone(input, timeZone, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}
