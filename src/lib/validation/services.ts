import { z } from "zod"

export const serviceSchema = z.object({
  name: z.string().trim().min(2, "Name the treatment").max(80),
  description: z.string().trim().max(400).default(""),
  default_duration_minutes: z.number().int().min(15, "At least 15 minutes").max(480, "At most 8 hours"),
  /** Minor units (cents / kobo) */
  default_price: z.number().int().min(0, "Price can't be negative"),
  is_active: z.boolean().default(true),
})

export const serviceUpdateSchema = serviceSchema.partial()

export const starterServicesSchema = z.object({
  services: z.array(serviceSchema).min(1, "Choose at least one treatment").max(30),
})

export type ServiceInput = z.infer<typeof serviceSchema>
