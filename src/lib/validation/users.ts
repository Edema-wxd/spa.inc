import { z } from "zod"

export const USER_ROLES = ["ADMIN", "STAFF"] as const

export const userInviteSchema = z.object({
  full_name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.email("Please enter a valid email address"),
  phone: z.string().optional(),
  role: z.enum(USER_ROLES),
})

export const staffUpdateSchema = z.object({
  full_name: z.string().trim().min(2).optional(),
  phone: z.string().optional(),
  is_active: z.boolean().optional(),
})

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24h)")

export const scheduleSchema = z.array(
  z.object({
    day_of_week: z.number().int().min(0).max(6),
    start_time: time,
    end_time: time,
    is_available: z.boolean(),
  })
)

export type UserInviteInput = z.infer<typeof userInviteSchema>
export type StaffUpdateInput = z.infer<typeof staffUpdateSchema>
export type ScheduleInput = z.infer<typeof scheduleSchema>
