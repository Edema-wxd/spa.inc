import { z } from "zod"
import { COUNTRY_CODES, countryFor } from "@/lib/countries"

export const SIGNUP_PLANS = ["essentials", "manager", "executive"] as const

const email = z.email("Please enter a valid email address").transform((v) => v.trim().toLowerCase())

export const signupSchema = z
  .object({
    business_name: z.string().trim().min(2, "Please enter your business name").max(80),
    full_name: z.string().trim().min(2, "Please enter your name").max(80),
    email,
    phone: z
      .string()
      .trim()
      .min(7, "Please enter a phone number")
      .max(20)
      .regex(/^[+\d\s()-]+$/, "Use digits only"),
    country_code: z.enum(COUNTRY_CODES, { error: "Choose your country" }),
    timezone: z.string().min(1, "Choose your timezone"),
    plan: z.enum(SIGNUP_PLANS),
    accept_terms: z.boolean().refine((v) => v, "Please accept the terms to continue"),
  })
  .refine((d) => (countryFor(d.country_code)?.timezones as readonly string[] | undefined)?.includes(d.timezone), {
    message: "Choose a timezone in your country",
    path: ["timezone"],
  })

export type SignupInput = z.infer<typeof signupSchema>

export const loginSchema = z.object({ email })

export const verifyCodeSchema = z.object({
  email,
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
  /** Where to go after signing in; only dashboard paths are allowed */
  next: z
    .string()
    .regex(/^\/dashboard(\/[\w\-/?=&%.]*)?$/)
    .optional(),
})
