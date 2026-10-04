import { z } from "zod"

export const locationSchema = z.object({
  name: z.string().trim().min(2, "Location name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  timezone: z.string().default("UTC"),
})

export type LocationInput = z.infer<typeof locationSchema>
