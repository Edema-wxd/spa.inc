import { z } from "zod"

export const PERIODS = ["daily", "weekly", "monthly"] as const

export const dateRangeQuerySchema = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
})

export const summaryQuerySchema = dateRangeQuerySchema.extend({
  period: z.enum(PERIODS).default("daily"),
})

export const monthsQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(24).default(6),
})
