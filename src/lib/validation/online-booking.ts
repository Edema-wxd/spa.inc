import { z } from "zod"

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose a time")

/** "any" lets the spa assign whichever therapist is free. */
export const ANY_THERAPIST = "any"

export const publicAvailabilityQuerySchema = z.object({
  serviceId: z.string().min(1),
  staffId: z.string().min(1).default(ANY_THERAPIST),
  date: z.iso.date(),
})

export const publicDaysQuerySchema = z.object({
  serviceId: z.string().min(1),
  staffId: z.string().min(1).default(ANY_THERAPIST),
})

/** What a client submits from the public booking page. */
export const publicBookingSchema = z.object({
  service_id: z.string().min(1, "Choose a service"),
  /** A therapist id, or "any" */
  staff_id: z.string().min(1),
  date: z.iso.date("Choose a date"),
  time,
  full_name: z.string().trim().min(2, "Please enter your name").max(120),
  phone: z
    .string()
    .trim()
    .min(7, "Please enter a phone number we can reach on WhatsApp")
    .max(20)
    .regex(/^[+\d\s()-]+$/, "Use digits only"),
  email: z.union([z.literal(""), z.email("Please enter a valid email address")]).optional(),
  notes: z.string().trim().max(500, "Please keep notes under 500 characters").optional(),
  accept_policy: z.boolean().refine((v) => v, "Please accept the cancellation policy"),
  /** Honeypot: hidden from people, filled in by bots */
  company: z.string().max(0).optional(),
})

export type PublicBookingInput = z.infer<typeof publicBookingSchema>

export const DEPOSIT_TYPES = ["NONE", "FIXED", "PERCENT"] as const

export const bookingSettingsSchema = z
  .object({
    enabled: z.boolean(),
    deposit_type: z.enum(DEPOSIT_TYPES),
    /** Minor units for FIXED, percent for PERCENT */
    deposit_value: z.number().int().min(0),
    cancellation_notice_hours: z.number().int().min(0).max(168),
    hold_minutes: z.number().int().min(30, "Card checkouts need at least 30 minutes").max(240),
    reminders_enabled: z.boolean(),
    reminder_hours_before: z.number().int().min(1).max(72),
    min_notice_minutes: z.number().int().min(0).max(2880),
    booking_window_days: z.number().int().min(1).max(180),
    welcome_message: z.string().trim().max(280),
  })
  .refine((s) => s.deposit_type !== "PERCENT" || (s.deposit_value >= 1 && s.deposit_value <= 100), {
    message: "Use a percentage between 1 and 100",
    path: ["deposit_value"],
  })
  .refine((s) => s.deposit_type !== "FIXED" || s.deposit_value >= 100, {
    message: "Set a deposit of at least 1.00",
    path: ["deposit_value"],
  })

export type BookingSettingsInput = z.infer<typeof bookingSettingsSchema>
