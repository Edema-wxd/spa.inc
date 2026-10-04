import { z } from "zod"

export const PAYMENT_METHODS = ["CASH", "CARD", "TRANSFER", "OTHER"] as const
export const PAYMENT_STATUSES = ["PENDING", "COMPLETED", "REFUNDED"] as const

export const paymentSchema = z.object({
  appointment_id: z.string().optional(),
  client_id: z.string().min(1, "Please select a client"),
  staff_id: z.string().min(1, "Please select a staff member"),
  service_id: z.string().optional(),
  /** Integer cents */
  amount: z.number().int().min(1, "Amount must be greater than 0"),
  payment_method: z.enum(PAYMENT_METHODS, { message: "Please select a payment method" }),
  payment_date: z.string().min(1, "Please select a date"),
  status: z.enum(PAYMENT_STATUSES).optional(),
  reference_note: z.string().optional(),
})

export type PaymentInput = z.infer<typeof paymentSchema>
