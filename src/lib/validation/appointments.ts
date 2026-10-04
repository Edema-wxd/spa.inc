import { z } from "zod"

export const APPOINTMENT_STATUSES = ["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const
export const LOCATION_TYPES = ["IN_SPA", "REMOTE"] as const

export const appointmentSchema = z.object({
  client_id: z.string().min(1, "Please select a client"),
  staff_id: z.string().min(1, "Please select a staff member"),
  service_id: z.string().min(1, "Please select a service"),
  scheduled_at: z.iso.datetime({ offset: true, message: "Invalid date and time" }),
  duration_minutes: z.number().int().min(15).max(480),
  location_type: z.enum(LOCATION_TYPES).default("IN_SPA"),
  location_notes: z.string().optional(),
  notes: z.string().optional(),
})

export const appointmentUpdateSchema = z.object({
  scheduled_at: z.iso.datetime({ offset: true }).optional(),
  duration_minutes: z.number().int().min(15).max(480).optional(),
  status: z.enum(APPOINTMENT_STATUSES).optional(),
  staff_id: z.string().optional(),
  location_type: z.enum(LOCATION_TYPES).optional(),
  location_notes: z.string().optional(),
  satisfaction_rating: z.number().int().min(1).max(5).nullable().optional(),
  notes: z.string().optional(),
})

export type AppointmentInput = z.infer<typeof appointmentSchema>
export type AppointmentUpdateInput = z.infer<typeof appointmentUpdateSchema>
