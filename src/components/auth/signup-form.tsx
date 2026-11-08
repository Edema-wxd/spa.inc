"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { z } from "zod"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CodeStep } from "@/components/auth/code-step"
import { ApiClientError, apiFetch } from "@/lib/api-client"
import { COUNTRIES, countryFor, timezoneLabel } from "@/lib/countries"
import { formatPrice, pricingTiers, FREE_TRIAL_DAYS } from "@/lib/pricing"
import { cn } from "@/lib/utils"
import { SIGNUP_PLANS, signupSchema } from "@/lib/validation/accounts"

type Values = z.input<typeof signupSchema>
type Plan = (typeof SIGNUP_PLANS)[number]

/** Best guess from the browser's timezone; the owner can change it. */
function guessLocation(): { country: Values["country_code"]; timezone: string } | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const country = COUNTRIES.find((c) => (c.timezones as readonly string[]).includes(tz))
    return country ? { country: country.code, timezone: tz } : null
  } catch {
    return null
  }
}

export function SignupForm({ initialPlan }: { initialPlan: Plan }) {
  const [sent, setSent] = useState<{ email: string; demoCode: string | null } | null>(null)
  const form = useForm<Values>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      business_name: "",
      full_name: "",
      email: "",
      phone: "",
      country_code: "US",
      timezone: "America/New_York",
      plan: initialPlan,
      accept_terms: false,
    },
  })
  const [countryCode, plan] = useWatch({ control: form.control, name: ["country_code", "plan"] })
  const country = countryFor(countryCode) ?? COUNTRIES[0]

  // Pre-fill country and timezone from the browser after hydration
  useEffect(() => {
    const guess = guessLocation()
    if (guess) {
      form.setValue("country_code", guess.country)
      form.setValue("timezone", guess.timezone)
    }
  }, [form])

  async function submit(values: Values) {
    try {
      const { data } = await apiFetch<{ email: string; demoCode: string | null }>("/api/auth/signup", { method: "POST", body: values })
      setSent({ email: data.email, demoCode: data.demoCode })
    } catch (err) {
      if (err instanceof ApiClientError && err.details) {
        for (const [field, messages] of Object.entries(err.details as Record<string, string[]>)) {
          form.setError(field as keyof Values, { message: messages[0] })
        }
      } else {
        toast.error(err instanceof Error ? err.message : "Could not start your trial")
      }
    }
  }

  if (sent) {
    return (
      <CodeStep
        email={sent.email}
        demoCode={sent.demoCode}
        onBack={() => setSent(null)}
        onResend={async () => {
          await submit(form.getValues())
          toast.success("New code sent")
        }}
      />
    )
  }

  const tiers = pricingTiers.filter((t): t is (typeof pricingTiers)[number] & { id: Plan } => (SIGNUP_PLANS as readonly string[]).includes(t.id))

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="space-y-5" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="business_name"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Business name</FormLabel>
                <FormControl>
                  <Input autoComplete="organization" placeholder="Glow Day Spa" autoFocus {...field} />
                </FormControl>
                <FormDescription>Shown on your booking page.</FormDescription>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your name</FormLabel>
                <FormControl>
                  <Input autoComplete="name" {...field} />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Business phone</FormLabel>
                <FormControl>
                  <Input type="tel" autoComplete="tel" {...field} />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" placeholder="you@yourspa.com" {...field} />
                </FormControl>
                <FormDescription>You&apos;ll sign in with a code sent here.</FormDescription>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="country_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(code) => {
                    // Radix reports "" when the value is set programmatically; ignore it
                    if (!code) return
                    field.onChange(code)
                    form.setValue("timezone", countryFor(code)!.timezones[0])
                  }}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="timezone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Timezone</FormLabel>
                <Select value={field.value} onValueChange={(tz) => tz && field.onChange(tz)} disabled={country.timezones.length === 1}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {country.timezones.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {timezoneLabel(tz)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="plan"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Plan after your trial</FormLabel>
              <FormDescription>
                Every plan starts with {FREE_TRIAL_DAYS} days of everything. No card needed. You can change this later.
              </FormDescription>
              <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Plan after your trial">
                {tiers.map((tier) => {
                  const selected = plan === tier.id
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => field.onChange(tier.id)}
                      className={cn(
                        "rounded-xl border p-3 text-left transition-colors hover:border-spa-accent",
                        selected && "border-spa-primary bg-spa-50 ring-1 ring-spa-primary"
                      )}
                    >
                      <span className="flex items-center justify-between font-semibold">
                        {tier.name}
                        {selected && <Check className="h-4 w-4 text-spa-primary" />}
                      </span>
                      <span className="block text-sm">
                        {tier.prices ? `${formatPrice(tier.prices[country.currency], country.currency)}/mo` : "Custom"}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">{tier.audience}</span>
                    </button>
                  )
                })}
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="accept_terms"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-start gap-2">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} className="mt-0.5" />
                </FormControl>
                <FormLabel className="text-sm font-normal leading-snug">
                  I agree to the terms of service and privacy policy, and I&apos;m allowed to sign up this business.
                </FormLabel>
              </div>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Start my free trial
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-spa-accent hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </Form>
  )
}
