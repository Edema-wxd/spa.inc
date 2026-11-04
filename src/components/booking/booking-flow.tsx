"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, CalendarDays, Check, Clock, Loader2, ShieldCheck, Sparkles, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ApiClientError, apiFetch } from "@/lib/api-client"
import { formatDateKey, formatMinutes, timeToMinutes } from "@/lib/time"
import { cn } from "@/lib/utils"
import { ANY_THERAPIST, publicBookingSchema, type PublicBookingInput } from "@/lib/validation/online-booking"
import type { PublicBusiness } from "@/server/services/online-booking"

type Step = "service" | "time" | "details"

const STEPS: { id: Step; label: string }[] = [
  { id: "service", label: "Treatment" },
  { id: "time", label: "Time" },
  { id: "details", label: "Your details" },
]

function Stepper({ step }: { step: Step }) {
  const index = STEPS.findIndex((s) => s.id === step)
  return (
    <ol className="mb-6 flex items-center gap-2 text-xs font-medium" aria-label="Booking steps">
      {STEPS.map((s, i) => (
        <li key={s.id} className="flex flex-1 items-center gap-2" aria-current={i === index ? "step" : undefined}>
          <span
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
              i < index && "border-spa-accent bg-spa-accent text-white",
              i === index && "border-spa-primary bg-spa-primary text-white",
              i > index && "text-muted-foreground"
            )}
          >
            {i < index ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </span>
          <span className={cn("truncate", i > index && "text-muted-foreground")}>{s.label}</span>
          {i < STEPS.length - 1 && <span className="h-px flex-1 bg-border" />}
        </li>
      ))}
    </ol>
  )
}

export function BookingFlow({ business }: { business: PublicBusiness }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>("service")
  const [serviceId, setServiceId] = useState<string | null>(null)
  const [staffId, setStaffId] = useState<string>(ANY_THERAPIST)
  const [date, setDate] = useState<string | null>(null)
  const [time, setTime] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const topRef = useRef<HTMLDivElement>(null)

  const service = business.services.find((s) => s.id === serviceId) ?? null
  const staffLabel = staffId === ANY_THERAPIST ? "First available" : business.staff.find((s) => s.id === staffId)?.firstName

  // Days with any free time, for the date strip
  const daysKey = serviceId ? `${serviceId}|${staffId}` : null
  const [days, setDays] = useState<{ key: string; days: { date: string; available: boolean }[] } | null>(null)
  useEffect(() => {
    if (!daysKey || !serviceId) return
    let cancelled = false
    apiFetch<{ days: { date: string; available: boolean }[] }>(
      `/api/public/${business.slug}/days?${new URLSearchParams({ serviceId, staffId })}`
    )
      .then(({ data }) => {
        if (cancelled) return
        setDays({ key: daysKey, days: data.days })
        // Jump to the first day with space if the chosen one is full
        const firstOpen = data.days.find((d) => d.available)?.date ?? null
        setDate((current) => (current && data.days.some((d) => d.date === current && d.available) ? current : firstOpen))
      })
      .catch(() => !cancelled && setDays({ key: daysKey, days: [] }))
    return () => {
      cancelled = true
    }
  }, [daysKey, serviceId, staffId, business.slug])
  const dayList = days?.key === daysKey ? days.days : null

  // Free times on the chosen day
  const slotsKey = serviceId && date ? `${serviceId}|${staffId}|${date}` : null
  const [slots, setSlots] = useState<{ key: string; slots: string[] } | null>(null)
  useEffect(() => {
    if (!slotsKey || !serviceId || !date) return
    let cancelled = false
    apiFetch<{ slots: string[] }>(`/api/public/${business.slug}/availability?${new URLSearchParams({ serviceId, staffId, date })}`)
      .then(({ data }) => !cancelled && setSlots({ key: slotsKey, slots: data.slots }))
      .catch(() => !cancelled && setSlots({ key: slotsKey, slots: [] }))
    return () => {
      cancelled = true
    }
  }, [slotsKey, serviceId, staffId, date, business.slug])
  const slotList = slots?.key === slotsKey ? slots.slots : null

  const form = useForm<PublicBookingInput>({
    resolver: zodResolver(publicBookingSchema),
    defaultValues: {
      service_id: "",
      staff_id: ANY_THERAPIST,
      date: "",
      time: "",
      full_name: "",
      phone: "",
      email: "",
      notes: "",
      accept_policy: false,
      company: "",
    },
  })

  const go = (next: Step) => {
    setStep(next)
    setServerError(null)
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  async function onSubmit(values: PublicBookingInput) {
    if (!service || !date || !time) return
    setServerError(null)
    try {
      const { data } = await apiFetch<{ manageUrl: string; checkoutUrl: string | null }>(`/api/public/${business.slug}/bookings`, {
        method: "POST",
        body: { ...values, service_id: service.id, staff_id: staffId, date, time },
      })
      if (data.checkoutUrl) window.location.assign(data.checkoutUrl)
      else router.push(new URL(data.manageUrl).pathname)
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "BOOKING_UNAVAILABLE" && err.status === 409) {
        // The time went while they were typing: send them back to pick another
        setSlots(null)
        setTime(null)
        setStep("time")
      }
      if (err instanceof ApiClientError && err.code === "VALIDATION_ERROR" && err.details) {
        for (const [field, messages] of Object.entries(err.details as Record<string, string[]>)) {
          form.setError(field as keyof PublicBookingInput, { message: messages[0] })
        }
      }
      setServerError(err instanceof Error ? err.message : "We couldn't take the booking. Please try again.")
    }
  }

  const groups = slotList
    ? [
        { label: "Morning", slots: slotList.filter((t) => timeToMinutes(t) < 12 * 60) },
        { label: "Afternoon", slots: slotList.filter((t) => timeToMinutes(t) >= 12 * 60 && timeToMinutes(t) < 17 * 60) },
        { label: "Evening", slots: slotList.filter((t) => timeToMinutes(t) >= 17 * 60) },
      ].filter((g) => g.slots.length > 0)
    : []

  return (
    <div ref={topRef} className="scroll-mt-4 rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
      <Stepper step={step} />

      {/* Step 1: treatment */}
      {step === "service" && (
        <section aria-labelledby="choose-service">
          <h2 id="choose-service" className="text-lg font-semibold">
            Choose a treatment
          </h2>
          <ul className="mt-4 space-y-3">
            {business.services.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => {
                    setServiceId(s.id)
                    setTime(null)
                    go("time")
                  }}
                  className={cn(
                    "w-full rounded-xl border p-4 text-left transition-colors hover:border-spa-accent hover:bg-spa-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spa-accent",
                    s.id === serviceId && "border-spa-accent bg-spa-50"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{s.name}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {s.duration} min
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold">{s.priceLabel}</p>
                      {s.depositLabel && <p className="text-xs text-muted-foreground">{s.depositLabel} deposit</p>}
                    </div>
                  </div>
                  {s.description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Step 2: therapist and time */}
      {step === "time" && service && (
        <section aria-labelledby="choose-time" className="space-y-6">
          <div>
            <button type="button" onClick={() => go("service")} className="mb-3 flex items-center gap-1 text-sm text-spa-accent hover:underline">
              <ArrowLeft className="h-4 w-4" />
              {service.name}, {service.duration} min
            </button>
            <h2 id="choose-time" className="text-lg font-semibold">
              Pick a time
            </h2>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Therapist</p>
            <div className="flex flex-wrap gap-2">
              {[{ id: ANY_THERAPIST, firstName: "First available" }, ...business.staff].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={staffId === s.id}
                  onClick={() => {
                    setStaffId(s.id)
                    setTime(null)
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition-colors hover:border-spa-accent",
                    staffId === s.id ? "border-spa-primary bg-spa-primary text-white hover:border-spa-primary" : "bg-background"
                  )}
                >
                  {s.firstName}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Day</p>
            {!dayList ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Finding free days
              </p>
            ) : !dayList.some((d) => d.available) ? (
              <p className="text-sm text-muted-foreground">
                No free times in the next {dayList.length} days{staffId !== ANY_THERAPIST && " with this therapist. Try First available"}.
              </p>
            ) : (
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2" role="listbox" aria-label="Choose a day">
                {dayList.map((d) => {
                  const selected = d.date === date
                  return (
                    <button
                      key={d.date}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      disabled={!d.available}
                      onClick={() => {
                        setDate(d.date)
                        setTime(null)
                      }}
                      className={cn(
                        "flex w-14 shrink-0 flex-col items-center rounded-xl border py-2 text-xs transition-colors",
                        selected && "border-spa-primary bg-spa-primary text-white",
                        !selected && d.available && "bg-background hover:border-spa-accent",
                        !d.available && "cursor-not-allowed opacity-40"
                      )}
                    >
                      <span className={cn(!selected && "text-muted-foreground")}>{formatDateKey(d.date, { weekday: "short" })}</span>
                      <span className="text-lg font-semibold leading-tight">{formatDateKey(d.date, { day: "numeric" })}</span>
                      <span className={cn(!selected && "text-muted-foreground")}>{formatDateKey(d.date, { month: "short" })}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {date && dayList?.some((d) => d.available) && (
            <div>
              <p className="mb-2 text-sm font-medium">{formatDateKey(date, { weekday: "long", month: "long", day: "numeric" })}</p>
              {!slotList ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Checking times
                </p>
              ) : slotList.length === 0 ? (
                <p className="text-sm text-muted-foreground">That day just filled up. Please pick another.</p>
              ) : (
                <div className="space-y-3">
                  {groups.map((g) => (
                    <div key={g.label}>
                      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{g.label}</p>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {g.slots.map((t) => (
                          <button
                            key={t}
                            type="button"
                            aria-pressed={t === time}
                            onClick={() => setTime(t)}
                            className={cn(
                              "rounded-lg border py-2 text-sm font-medium transition-colors",
                              t === time ? "border-spa-primary bg-spa-primary text-white" : "bg-background hover:border-spa-accent"
                            )}
                          >
                            {formatMinutes(timeToMinutes(t))}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <Button
            className="w-full"
            size="lg"
            disabled={!time}
            onClick={() => {
              // The details form submits the whole booking, so it carries the choices too
              form.setValue("service_id", service.id)
              form.setValue("staff_id", staffId)
              form.setValue("date", date ?? "")
              form.setValue("time", time ?? "")
              go("details")
            }}
          >
            Continue
          </Button>
        </section>
      )}

      {/* Step 3: details */}
      {step === "details" && service && date && time && (
        <section aria-labelledby="your-details" className="space-y-5">
          <div>
            <button type="button" onClick={() => go("time")} className="mb-3 flex items-center gap-1 text-sm text-spa-accent hover:underline">
              <ArrowLeft className="h-4 w-4" />
              Change time
            </button>
            <h2 id="your-details" className="text-lg font-semibold">
              Your details
            </h2>
          </div>

          <div className="rounded-xl bg-spa-50 p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold">
              <Sparkles className="h-4 w-4 text-spa-accent" />
              {service.name}
            </p>
            <p className="mt-1.5 flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              {formatDateKey(date, { weekday: "long", month: "long", day: "numeric" })} at {formatMinutes(timeToMinutes(time))}
            </p>
            <p className="mt-1 flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              {staffLabel}, {service.duration} min, {service.priceLabel}
            </p>
            {service.depositLabel && (
              <p className="mt-3 border-t border-spa-200 pt-3 font-medium">
                {service.depositLabel} deposit now, the rest after your treatment
              </p>
            )}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
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
                    <FormLabel>Mobile number (WhatsApp)</FormLabel>
                    <FormControl>
                      <Input type="tel" inputMode="tel" autoComplete="tel" placeholder="We'll send your confirmation here" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Email <span className="font-normal text-muted-foreground">(optional, for your receipt)</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Anything we should know? <span className="font-normal text-muted-foreground">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="Injuries, pressure preference, pregnancy" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              {/* Honeypot: hidden from people */}
              <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
                <label>
                  Company
                  <input tabIndex={-1} autoComplete="off" {...form.register("company")} />
                </label>
              </div>

              <FormField
                control={form.control}
                name="accept_policy"
                render={({ field }) => (
                  <FormItem className="rounded-xl border p-3">
                    <div className="flex items-start gap-3">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} className="mt-0.5" />
                      </FormControl>
                      <div className="space-y-1">
                        <FormLabel className="flex items-center gap-1.5 font-medium">
                          <ShieldCheck className="h-4 w-4 text-spa-accent" />
                          Cancellation policy
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">{service.policy}</p>
                      </div>
                    </div>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {serverError && (
                <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {serverError}
                </p>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {service.depositLabel ? `Book and pay ${service.depositLabel} deposit` : "Confirm booking"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                {service.depositLabel
                  ? `We'll hold this time for ${business.holdMinutes} minutes while you pay.`
                  : "You'll get a confirmation on WhatsApp."}
              </p>
            </form>
          </Form>
        </section>
      )}
    </div>
  )
}
