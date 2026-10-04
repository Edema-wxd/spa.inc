import { z } from "zod"

export const clientSchema = z.object({
  full_name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.email("Please enter a valid email address"),
  phone: z.string().trim().min(1, "Phone number is required"),
  date_of_birth: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
})

export const clientUpdateSchema = clientSchema.partial()

export type ClientInput = z.infer<typeof clientSchema>
export type ClientUpdateInput = z.infer<typeof clientUpdateSchema>
