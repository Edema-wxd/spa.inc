"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Lock } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ApiClientError, apiFetch } from "@/lib/api-client"
import { bookingSettingsSchema, type BookingSettingsInput } from "@/lib/validation/online-booking"
import type { BookingSettings, BusinessCurrency } from "@/types"

const NOTICE_OPTIONS = [
  { value: 0, label: "No minimum" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
  { value: 240, label: "4 hours" },
  { value: 1440, label: "1 day" },
]

function NumberInput({ value, onChange, ...props }: { value: number; onChange: (n: number) => void } & Omit<React.ComponentProps<typeof Input>, "value" | "onChange">) {
  return <Input type="number" inputMode="numeric" value={Number.isFinite(value) ? value : ""} onChange={(e) => onChange(Math.round(Number(e.target.value)))} {...props} />
}

function Locked({ feature }: { feature: string }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Lock className="h-3.5 w-3.5" />
      {feature} start on the Manager plan.{" "}
      <Link href="/dashboard/settings?tab=plan" className="text-spa-accent hover:underline">
        Upgrade
      </Link>
    </p>
  )
}

export function BookingSettingsForm({
  settings,
  features,
  currency,
}: {
  settings: BookingSettings
  features: { deposits: boolean; whatsappReminders: boolean }
  currency: BusinessCurrency
}) {
  const router = useRouter()
  const form = useForm<BookingSettingsInput>({
    resolver: zodResolver(bookingSettingsSchema),
    defaultValues: settings,
  })
  const [depositType, remindersOn] = useWatch({ control: form.control, name: ["deposit_type", "reminders_enabled"] })
  const symbol = currency === "NGN" ? "₦" : "$"
  // Fixed deposits are stored in minor units and typed in major units
  const [fixedText, setFixedText] = useState(
    settings.deposit_type === "FIXED" ? String(settings.deposit_value / 100) : "20"
  )

  async function onSubmit(values: BookingSettingsInput) {
    try {
      await apiFetch("/api/online-booking", { method: "PUT", body: values })
      toast.success("Booking settings saved")
      router.refresh()
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "VALIDATION_ERROR" && err.details) {
        for (const [field, messages] of Object.entries(err.details as Record<string, string[]>)) {
          form.setError(field as keyof BookingSettingsInput, { message: messages[0] })
        }
      }
      toast.error(err instanceof Error ? err.message : "Could not save settings")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Booking rules</CardTitle>
        <CardDescription>What clients can book online and what happens when plans change.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4 rounded-lg border p-3">
                  <div>
                    <FormLabel>Accept online bookings</FormLabel>
                    <FormDescription>When off, your booking page asks clients to call instead.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormField
                control={form.control}
                name="deposit_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deposit</FormLabel>
                    <FormDescription>Held when the client books and taken off their bill. Kept for late cancellations and no-shows.</FormDescription>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value)
                          if (value === "FIXED") form.setValue("deposit_value", Math.round(Number(fixedText) * 100) || 0)
                          if (value === "PERCENT") form.setValue("deposit_value", 25)
                          if (value === "NONE") form.setValue("deposit_value", 0)
                        }}
                        className="flex flex-wrap gap-4"
                        disabled={!features.deposits}
                      >
                        {[
                          { value: "NONE", label: "No deposit" },
                          { value: "FIXED", label: "Fixed amount" },
                          { value: "PERCENT", label: "Percent of price" },
                        ].map((o) => (
                          <div key={o.value} className="flex items-center gap-2">
                            <RadioGroupItem value={o.value} id={`deposit-${o.value}`} />
                            <Label htmlFor={`deposit-${o.value}`} className="font-normal">
                              {o.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    {!features.deposits && <Locked feature="Deposits" />}
                  </FormItem>
                )}
              />
              {depositType === "FIXED" && (
                <FormField
                  control={form.control}
                  name="deposit_value"
                  render={({ field }) => (
                    <FormItem className="max-w-48">
                      <FormLabel>Amount ({symbol})</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="decimal"
                          min="1"
                          step="0.01"
                          value={fixedText}
                          onChange={(e) => {
                            setFixedText(e.target.value)
                            field.onChange(Math.round((Number(e.target.value) || 0) * 100))
                          }}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              )}
              {depositType === "PERCENT" && (
                <FormField
                  control={form.control}
                  name="deposit_value"
                  render={({ field }) => (
                    <FormItem className="max-w-48">
                      <FormLabel>Percent of the price</FormLabel>
                      <FormControl>
                        <NumberInput min={1} max={100} value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="cancellation_notice_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Free cancellation until (hours before)</FormLabel>
                    <FormControl>
                      <NumberInput min={0} max={168} value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormDescription>Earlier cancellations get the deposit back.</FormDescription>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hold_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hold an unpaid booking for (minutes)</FormLabel>
                    <FormControl>
                      <NumberInput min={30} max={240} value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormDescription>Then the time is released for someone else.</FormDescription>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="min_notice_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum notice</FormLabel>
                    <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {NOTICE_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={String(o.value)}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>The earliest a client can book ahead.</FormDescription>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="booking_window_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Book up to (days ahead)</FormLabel>
                    <FormControl>
                      <NumberInput min={1} max={180} value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <FormField
                control={form.control}
                name="reminders_enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-4 rounded-lg border p-3">
                    <div>
                      <FormLabel>WhatsApp reminders</FormLabel>
                      <FormDescription>A reminder before every booking. Clients reply 1 to confirm or 2 to change it.</FormDescription>
                      {!features.whatsappReminders && <Locked feature="WhatsApp reminders" />}
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!features.whatsappReminders} />
                    </FormControl>
                  </FormItem>
                )}
              />
              {remindersOn && features.whatsappReminders && (
                <FormField
                  control={form.control}
                  name="reminder_hours_before"
                  render={({ field }) => (
                    <FormItem className="max-w-48">
                      <FormLabel>Send it (hours before)</FormLabel>
                      <FormControl>
                        <NumberInput min={1} max={72} value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="welcome_message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Welcome message on your booking page</FormLabel>
                  <FormControl>
                    <Textarea rows={2} maxLength={280} placeholder="What makes your spa special, parking, what to bring" {...field} />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Save booking rules
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
