import { z } from "zod"

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM")

/** Someone who takes bookings: the owner themselves, or a therapist on the team. */
export const teamMemberSchema = z
  .object({
    self: z.boolean(),
    full_name: z.string().trim().max(80).optional(),
    email: z.union([z.literal(""), z.email("Please enter a valid email address")]).optional(),
    phone: z.string().trim().max(20).optional(),
    days: z.array(z.number().int().min(0).max(6)).min(1, "Choose at least one working day"),
    start_time: time,
    end_time: time,
  })
  .refine((d) => d.end_time > d.start_time, { message: "Finish after the start time", path: ["end_time"] })
  .refine((d) => d.self || (d.full_name?.length ?? 0) >= 2, { message: "Enter their name", path: ["full_name"] })
  .refine((d) => d.self || !!d.email, { message: "Enter their email so they can sign in", path: ["email"] })

export type TeamMemberInput = z.infer<typeof teamMemberSchema>

export const onboardingProgressSchema = z.object({ action: z.enum(["link_shared", "dismiss"]) })
