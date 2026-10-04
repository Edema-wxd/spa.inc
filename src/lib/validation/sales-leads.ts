import { z } from "zod"
import { TIER_IDS } from "@/lib/plans"

export const LOCATION_OPTIONS = ["1", "2-3", "4-10", "10+"] as const
export const STAFF_OPTIONS = ["1-5", "6-15", "16-50", "50+"] as const

export const salesLeadSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your name"),
  email: z.email("Please enter a valid email address"),
  phone: z.string().trim().min(7, "Please enter a valid phone number"),
  businessName: z.string().trim().min(2, "Please enter your business name"),
  plan: z.enum(TIER_IDS),
  locations: z.enum(LOCATION_OPTIONS, { error: "Select number of locations" }),
  staffCount: z.enum(STAFF_OPTIONS, { error: "Select team size" }),
  addOns: z.array(z.string()),
  message: z.string().max(1000, "Message must be under 1000 characters").optional(),
})

export type SalesLeadInput = z.infer<typeof salesLeadSchema>
