import { z } from "zod"

export const EXPENSE_CATEGORIES = [
  "SUPPLIES",
  "UTILITIES",
  "RENT",
  "PAYROLL",
  "EQUIPMENT",
  "MARKETING",
  "OTHER",
] as const

export const RECURRENCE_INTERVALS = ["DAILY", "WEEKLY", "MONTHLY"] as const

export const expenseSchema = z
  .object({
    category: z.enum(EXPENSE_CATEGORIES, { message: "Please select a category" }),
    description: z.string().trim().min(1, "Description is required"),
    /** Integer cents */
    amount: z.number().int().min(1, "Amount must be greater than 0"),
    expense_date: z.string().min(1, "Please select a date"),
    is_recurring: z.boolean(),
    recurrence_interval: z.enum(RECURRENCE_INTERVALS).optional(),
  })
  .refine((data) => !data.is_recurring || !!data.recurrence_interval, {
    message: "Choose how often this expense repeats",
    path: ["recurrence_interval"],
  })

export const expenseUpdateSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  description: z.string().trim().min(1).optional(),
  amount: z.number().int().min(1).optional(),
  expense_date: z.string().min(1).optional(),
  is_recurring: z.boolean().optional(),
  recurrence_interval: z.enum(RECURRENCE_INTERVALS).nullable().optional(),
})

export type ExpenseInput = z.infer<typeof expenseSchema>
export type ExpenseUpdateInput = z.infer<typeof expenseUpdateSchema>
