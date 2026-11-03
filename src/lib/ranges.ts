import { addDays, monthsBefore, type DateKey } from "@/lib/time"

/** Reporting periods offered on analytics pages (`?range=`). */
export const RANGE_PRESETS = [
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "12m", label: "Last 12 months" },
] as const

export type RangePreset = (typeof RANGE_PRESETS)[number]["id"]

export function isRangePreset(value: unknown): value is RangePreset {
  return RANGE_PRESETS.some((r) => r.id === value)
}

export function resolveRange(preset: RangePreset, todayKey: DateKey): { from: DateKey; to: DateKey; label: string } {
  const label = RANGE_PRESETS.find((r) => r.id === preset)!.label
  if (preset === "12m") return { from: monthsBefore(todayKey, 11), to: todayKey, label }
  return { from: addDays(todayKey, preset === "30d" ? -29 : -89), to: todayKey, label }
}
