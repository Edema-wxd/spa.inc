import { z } from "zod"

export const APPOINTMENT_STATUSES = ["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const
export const LOCATION_TYPES = ["IN_SPA", "REMOTE"] as const

export const appointmentSchema = z.object({
  client_id: z.string().min(1, "Please select a client"),
  staff_id: z.string().min(1, "Please select a staff member"),
  service_id: z.string().min(1, "Please select a service"),
  scheduled_at: z.iso.datetime({ offset: true, message: "Invalid date and time" }),
  /** Defaults to the service's duration */
  duration_minutes: z.number().int().min(15).max(480).optional(),
  location_type: z.enum(LOCATION_TYPES).default("IN_SPA"),
  location_notes: z.string().optional(),
  notes: z.string().optional(),
  /** Admins can book outside a therapist's working hours on purpose */
  allow_outside_hours: z.boolean().optional(),
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
  allow_outside_hours: z.boolean().optional(),
})

export const availabilityQuerySchema = z.object({
  staffId: z.string().min(1),
  date: z.iso.date(),
  serviceId: z.string().optional(),
  duration: z.coerce.number().int().min(15).max(480).optional(),
  /** Ignore this appointment when rescheduling it */
  excludeId: z.string().optional(),
})

/**
 * The booking dialog collects a wall-clock date and time; the client converts
 * them to `scheduled_at` in the business timezone before calling the API.
 */
export const bookingFormSchema = z
  .object({
    client_id: z.string().min(1, "Choose a client"),
    service_id: z.string().min(1, "Choose a service"),
    staff_id: z.string().min(1, "Choose a therapist"),
    date: z.iso.date("Choose a date"),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose a time"),
    location_type: z.enum(LOCATION_TYPES),
    location_notes: z.string().optional(),
    notes: z.string().optional(),
    allow_outside_hours: z.boolean(),
  })
  .refine((d) => d.location_type !== "REMOTE" || !!d.location_notes?.trim(), {
    message: "Add the address for a mobile visit",
    path: ["location_notes"],
  })

export type BookingFormValues = z.infer<typeof bookingFormSchema>

export type AppointmentInput = z.infer<typeof appointmentSchema>
export type AppointmentUpdateInput = z.infer<typeof appointmentUpdateSchema>
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>
