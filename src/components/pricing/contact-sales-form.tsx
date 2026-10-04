"use client"

import { useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod/v4"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { addOns, pricingTiers, type TierId } from "@/lib/pricing"

const tierIds = pricingTiers.map((t) => t.id) as [TierId, ...TierId[]]

const locationOptions = ["1", "2-3", "4-10", "10+"] as const
const staffOptions = ["1-5", "6-15", "16-50", "50+"] as const

const contactSalesSchema = z.object({
  fullName: z.string().min(2, "Please enter your name"),
  email: z.email("Please enter a valid email address"),
  phone: z.string().min(7, "Please enter a valid phone number"),
  businessName: z.string().min(2, "Please enter your business name"),
  plan: z.enum(tierIds),
  locations: z.enum(locationOptions, { error: "Select number of locations" }),
  staffCount: z.enum(staffOptions, { error: "Select team size" }),
  addOns: z.array(z.string()),
  message: z.string().max(1000, "Message must be under 1000 characters").optional(),
})

type ContactSalesValues = z.infer<typeof contactSalesSchema>

function isTierId(value: string | null): value is TierId {
  return !!value && (tierIds as string[]).includes(value)
}

export function ContactSalesForm() {
  const searchParams = useSearchParams()
  const [submitted, setSubmitted] = useState(false)

  const planParam = searchParams.get("plan")
  const addOnParam = searchParams.get("addon")

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactSalesValues>({
    resolver: zodResolver(contactSalesSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      businessName: "",
      plan: isTierId(planParam) ? planParam : "enterprise",
      addOns: addOns.some((a) => a.id === addOnParam) ? [addOnParam as string] : [],
      message: "",
    },
  })

  function onSubmit(data: ContactSalesValues) {
    // TODO: send to CRM / API route once the backend exists
    console.log("Sales enquiry:", data)
    toast.success("Thanks! Our sales team will be in touch within one business day.")
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-600" />
          <h2 className="text-xl font-semibold">Request received</h2>
          <p className="max-w-sm text-muted-foreground">
            A member of our sales team will reach out within one business day to
            put together your custom quote.
          </p>
          <Button asChild variant="outline">
            <Link href="/pricing">Back to pricing</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tell us about your business</CardTitle>
        <CardDescription>
          We will tailor a quote to your locations, team size, and add-ons.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="fullName" error={errors.fullName?.message}>
              <Input id="fullName" {...register("fullName")} aria-invalid={!!errors.fullName} />
            </Field>
            <Field label="Work email" htmlFor="email" error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                placeholder="you@yourspa.com"
                {...register("email")}
                aria-invalid={!!errors.email}
              />
            </Field>
            <Field label="Phone" htmlFor="phone" error={errors.phone?.message}>
              <Input
                id="phone"
                type="tel"
                placeholder="+234"
                {...register("phone")}
                aria-invalid={!!errors.phone}
              />
            </Field>
            <Field label="Business name" htmlFor="businessName" error={errors.businessName?.message}>
              <Input
                id="businessName"
                {...register("businessName")}
                aria-invalid={!!errors.businessName}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Plan of interest" htmlFor="plan" error={errors.plan?.message}>
              <Controller
                control={control}
                name="plan"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="plan" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {pricingTiers.map((tier) => (
                        <SelectItem key={tier.id} value={tier.id}>
                          {tier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Locations" htmlFor="locations" error={errors.locations?.message}>
              <Controller
                control={control}
                name="locations"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="locations" className="w-full" aria-invalid={!!errors.locations}>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {locationOptions.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Team size" htmlFor="staffCount" error={errors.staffCount?.message}>
              <Controller
                control={control}
                name="staffCount"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="staffCount" className="w-full" aria-invalid={!!errors.staffCount}>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffOptions.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt} staff
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Add-ons you are interested in</legend>
            <Controller
              control={control}
              name="addOns"
              render={({ field }) => (
                <div className="grid gap-2 sm:grid-cols-2">
                  {addOns.map((addOn) => {
                    const checked = field.value.includes(addOn.id)
                    return (
                      <Label
                        key={addOn.id}
                        htmlFor={`addon-${addOn.id}`}
                        className="flex cursor-pointer items-center gap-2 rounded-md border p-3 font-normal"
                      >
                        <Checkbox
                          id={`addon-${addOn.id}`}
                          checked={checked}
                          onCheckedChange={(value) =>
                            field.onChange(
                              value
                                ? [...field.value, addOn.id]
                                : field.value.filter((id) => id !== addOn.id)
                            )
                          }
                        />
                        {addOn.name}
                      </Label>
                    )
                  })}
                </div>
              )}
            />
          </fieldset>

          <Field label="Anything else we should know?" htmlFor="message" error={errors.message?.message}>
            <Textarea
              id="message"
              rows={4}
              placeholder="Current tools, branch locations, go-live timeline..."
              {...register("message")}
            />
          </Field>

          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            Request a custom quote
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string
  htmlFor: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
