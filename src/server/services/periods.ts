import { format, parseISO, startOfWeek } from "date-fns"
import type { PERIODS } from "@/lib/validation/query"

export type Period = (typeof PERIODS)[number]

/** Group key for a date: "2025-03-14", week-start "2025-03-10", or "2025-03". */
export function bucketKey(dateIso: string, period: Period): string {
  const date = parseISO(dateIso)
  if (period === "monthly") return format(date, "yyyy-MM")
  if (period === "weekly") return format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd")
  return format(date, "yyyy-MM-dd")
}
