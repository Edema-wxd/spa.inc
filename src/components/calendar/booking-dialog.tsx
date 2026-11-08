"use client"

import { useEffect, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, ChevronsUpDown, Loader2, UserPlus } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ApiClientError, apiFetch } from "@/lib/api-client"
import { formatDateKey, formatMinutes, timeToMinutes, zonedTimeToUtc } from "@/lib/time"
import { cn, formatCurrency } from "@/lib/utils"
import { bookingFormSchema, type BookingFormValues } from "@/lib/validation/appointments"
import type { Availability, BookingOptions } from "@/server/services/appointments"
import type { Appointment } from "@/types"

export interface BookingDraft {
  mode: "create" | "reschedule"
  appointmentId?: string
  client_id?: string
  service_id?: string
  staff_id?: string
  date: string
  time?: string
}

interface BookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  draft: BookingDraft
  options: BookingOptions
  timezone: string
  todayKey: string
  /** Called after a successful booking with the booked date */
  onBooked: (date: string) => void
}

function SlotPicker({
  slots,
  value,
  onChange,
}: {
  slots: string[]
  value: string
  onChange: (time: string) => void
}) {
  const groups = [
    { label: "Morning", slots: slots.filter((t) => timeToMinutes(t) < 12 * 60) },
    { label: "Afternoon", slots: slots.filter((t) => timeToMinutes(t) >= 12 * 60 && timeToMinutes(t) < 17 * 60) },
    { label: "Evening", slots: slots.filter((t) => timeToMinutes(t) >= 17 * 60) },
  ].filter((g) => g.slots.length > 0)

  return (
    <div className="max-h-48 space-y-3 overflow-y-auto rounded-md border p-3">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">{group.label}</p>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {group.slots.map((slot) => (
              <Button
                key={slot}
                type="button"
                size="sm"
                variant={slot === value ? "default" : "outline"}
                className="h-8 text-xs"
                aria-pressed={slot === value}
                onClick={() => onChange(slot)}
              >
                {formatMinutes(timeToMinutes(slot))}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function BookingDialog({ open, onOpenChange, draft, options, timezone, todayKey, onBooked }: BookingDialogProps) {
  const isReschedule = draft.mode === "reschedule"
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      client_id: draft.client_id ?? "",
      service_id: draft.service_id ?? "",
      staff_id: draft.staff_id ?? options.staff[0]?.id ?? "",
      date: draft.date,
      time: draft.time ?? "",
      location_type: "IN_SPA",
      location_notes: "",
      notes: "",
      allow_outside_hours: false,
    },
  })
  const [clientPickerOpen, setClientPickerOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const [clientId, serviceId, staffId, date, time, locationType, allowOutside] = useWatch({
    control: form.control,
    name: ["client_id", "service_id", "staff_id", "date", "time", "location_type", "allow_outside_hours"],
  })
  const service = options.services.find((s) => s.id === serviceId)
  const client = options.clients.find((c) => c.id === clientId)
  const staffName = options.staff.find((s) => s.id === staffId)?.full_name

  // Free start times for the chosen therapist, service and date
  const requestKey = staffId && date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${staffId}|${serviceId}|${date}` : null
  const [loaded, setLoaded] = useState<{ key: string; data: Availability | null; error: string | null } | null>(null)
  useEffect(() => {
    if (!requestKey) return
    let cancelled = false
    const params = new URLSearchParams({ staffId, date })
    if (serviceId) params.set("serviceId", serviceId)
    if (draft.appointmentId) params.set("excludeId", draft.appointmentId)
    apiFetch<Availability>(`/api/availability?${params}`)
      .then(({ data }) => {
        if (cancelled) return
        setLoaded({ key: requestKey, data, error: null })
        // Drop a preselected time that is no longer free. Wait for a service: without one the
        // check uses a default length, which would drop a slot that fits a shorter treatment.
        const current = form.getValues("time")
        if (serviceId && current && !form.getValues("allow_outside_hours") && !data.slots.includes(current)) {
          form.setValue("time", "")
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoaded({ key: requestKey, data: null, error: err instanceof Error ? err.message : "Could not load times" })
      })
    return () => {
      cancelled = true
    }
  }, [requestKey, staffId, serviceId, date, draft.appointmentId, form])

  const loading = requestKey !== null && loaded?.key !== requestKey
  const availability = loaded?.key === requestKey ? loaded.data : null
  const availabilityError = loaded?.key === requestKey ? loaded.error : null

  async function onSubmit(values: BookingFormValues) {
    setServerError(null)
    const scheduledAt = zonedTimeToUtc(values.date, values.time, timezone).toISOString()
    try {
      if (isReschedule && draft.appointmentId) {
        await apiFetch<Appointment>(`/api/appointments/${draft.appointmentId}`, {
          method: "PUT",
          body: { scheduled_at: scheduledAt, staff_id: values.staff_id, allow_outside_hours: values.allow_outside_hours },
        })
        toast.success(`Moved to ${formatDateKey(values.date, { weekday: "short", month: "short", day: "numeric" })}, ${formatMinutes(timeToMinutes(values.time))}`)
      } else {
        await apiFetch<Appointment>("/api/appointments", {
          method: "POST",
          body: {
            client_id: values.client_id,
            staff_id: values.staff_id,
            service_id: values.service_id,
            scheduled_at: scheduledAt,
            location_type: values.location_type,
            location_notes: values.location_type === "REMOTE" ? values.location_notes : undefined,
            notes: values.notes || undefined,
            allow_outside_hours: values.allow_outside_hours,
          },
        })
        toast.success(`Booked ${client?.full_name ?? "client"} with ${staffName ?? "therapist"}`, {
          description: `${service?.name ?? "Appointment"}, ${formatDateKey(values.date, { weekday: "short", month: "short", day: "numeric" })} at ${formatMinutes(timeToMinutes(values.time))}`,
        })
      }
      onOpenChange(false)
      onBooked(values.date)
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "VALIDATION_ERROR" && err.details) {
        for (const [field, messages] of Object.entries(err.details as Record<string, string[]>)) {
          if (field in values) form.setError(field as keyof BookingFormValues, { message: messages[0] })
        }
      }
      setServerError(err instanceof Error ? err.message : "Could not save the booking")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isReschedule ? "Reschedule appointment" : "New booking"}</DialogTitle>
          <DialogDescription>
            {isReschedule
              ? `${client?.full_name ?? "Client"}, ${service?.name ?? "appointment"}. Pick a new therapist, date or time.`
              : "Only times when the therapist is working and free are offered."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Client</FormLabel>
                  <Popover open={clientPickerOpen} onOpenChange={setClientPickerOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          disabled={isReschedule}
                          className={cn("w-full justify-between font-normal", !field.value && "text-muted-foreground")}
                        >
                          {client ? client.full_name : "Search clients"}
                          <ChevronsUpDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Name or phone" />
                        <CommandList>
                          <CommandEmpty>
                            <p className="mb-2">No client found.</p>
                            <Button asChild size="sm" variant="outline">
                              <Link href="/dashboard/clients/new">
                                <UserPlus className="h-4 w-4" />
                                Add a client
                              </Link>
                            </Button>
                          </CommandEmpty>
                          <CommandGroup>
                            {options.clients.map((c) => (
                              <CommandItem
                                key={c.id}
                                value={`${c.full_name} ${c.phone}`}
                                onSelect={() => {
                                  field.onChange(c.id)
                                  setClientPickerOpen(false)
                                }}
                              >
                                <Check className={cn("h-4 w-4", c.id === field.value ? "opacity-100" : "opacity-0")} />
                                <span className="flex-1">{c.full_name}</span>
                                <span className="text-xs text-muted-foreground">{c.phone}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="service_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isReschedule}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a service" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {options.services.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} · {s.duration} min · {formatCurrency(s.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="staff_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Therapist</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose a therapist" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {options.staff.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.full_name}
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
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" min={allowOutside ? undefined : todayKey} {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

            </div>

            <FormField
              control={form.control}
              name="time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Time
                    {service && <span className="font-normal text-muted-foreground"> ({service.duration} min)</span>}
                  </FormLabel>
                  {allowOutside ? (
                    <FormControl>
                      <Input type="time" step={900} {...field} />
                    </FormControl>
                  ) : loading ? (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Checking {staffName ?? "therapist"}&apos;s availability
                    </p>
                  ) : availabilityError ? (
                    <p className="text-sm text-destructive">{availabilityError}</p>
                  ) : !availability ? (
                    <p className="text-sm text-muted-foreground">Choose a therapist and date to see free times.</p>
                  ) : !availability.workingHours ? (
                    <p className="text-sm text-muted-foreground">
                      {staffName} doesn&apos;t work on {formatDateKey(date, { weekday: "long" })}s. Try another day or therapist.
                    </p>
                  ) : availability.slots.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {staffName} is fully booked that day. Try another day or therapist.
                    </p>
                  ) : (
                    <SlotPicker slots={availability.slots} value={field.value} onChange={field.onChange} />
                  )}
                  {availability?.workingHours && !allowOutside && (
                    <p className="text-xs text-muted-foreground">
                      Working {formatMinutes(timeToMinutes(availability.workingHours.start))} to{" "}
                      {formatMinutes(timeToMinutes(availability.workingHours.end))}
                    </p>
                  )}
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="allow_outside_hours"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
                  </FormControl>
                  <FormLabel className="!mt-0 font-normal">Book outside working hours (admin override)</FormLabel>
                </FormItem>
              )}
            />

            {!isReschedule && (
              <>
                <FormField
                  control={form.control}
                  name="location_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Where</FormLabel>
                      <FormControl>
                        <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-4">
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="IN_SPA" id="loc-spa" />
                            <Label htmlFor="loc-spa" className="font-normal">At the spa</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="REMOTE" id="loc-remote" />
                            <Label htmlFor="loc-remote" className="font-normal">Mobile visit</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />
                {locationType === "REMOTE" && (
                  <FormField
                    control={form.control}
                    name="location_notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Visit address</FormLabel>
                        <FormControl>
                          <Input placeholder="Street, unit, access notes" {...field} />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea rows={2} placeholder="Preferences, focus areas, anything the therapist should know" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </>
            )}

            {serverError && (
              <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {serverError}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting || !time}>
                {form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isReschedule ? "Save new time" : "Book appointment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
