"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { formatCurrency } from "@/lib/utils"
import { apiFetch } from "@/lib/api-client"
import { paymentSchema, type PaymentInput } from "@/lib/validation/payments"
import type { PaymentFormData } from "@/server/services/payments"

type PaymentFormValues = PaymentInput

/** Money typed in dollars, stored as integer cents. */
function DollarInput({
  value,
  onChange,
  onBlur,
  name,
}: {
  value: number
  onChange: (cents: number) => void
  onBlur: () => void
  name: string
}) {
  const toText = (cents: number) => (cents ? (cents / 100).toFixed(2) : "")
  const [text, setText] = useState(toText(value))
  const [synced, setSynced] = useState(value)
  // Picking a service sets the amount from outside; reflect it in the box
  if (value !== synced) {
    setSynced(value)
    setText(toText(value))
  }
  return (
    <Input
      type="number"
      inputMode="decimal"
      min="0"
      step="0.01"
      placeholder="85.00"
      name={name}
      value={text}
      onBlur={onBlur}
      onChange={(e) => {
        const cents = Math.round((Number(e.target.value) || 0) * 100)
        setText(e.target.value)
        setSynced(cents)
        onChange(cents)
      }}
    />
  )
}

export function PaymentForm({ data }: { data: PaymentFormData }) {
  const router = useRouter()
  const { clients, staff: staffMembers, services: activeServices, prefill } = data

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      appointment_id: prefill?.appointment_id,
      client_id: prefill?.client_id ?? "",
      staff_id: prefill?.staff_id ?? "",
      service_id: prefill?.service_id ?? "",
      amount: prefill?.amount ?? 0,
      payment_method: "CARD",
      payment_date: prefill?.payment_date ?? data.today,
      reference_note: "",
    },
  })

  async function onSubmit(data: PaymentFormValues) {
    try {
      await apiFetch("/api/payments", { method: "POST", body: data })
      toast.success("Payment recorded successfully")
      router.push(prefill ? "/dashboard/calendar" : "/dashboard/payments")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not record payment")
    }
  }

  function handleServiceChange(serviceId: string) {
    form.setValue("service_id", serviceId)
    const service = activeServices.find((s) => s.id === serviceId)
    if (service) {
      form.setValue("amount", service.price)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="client_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="staff_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Staff Member</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a staff member" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {staffMembers.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="service_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Service</FormLabel>
                <Select
                  onValueChange={handleServiceChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a service (optional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {activeServices.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} ({formatCurrency(service.price)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount ($)</FormLabel>
                <FormControl>
                  <DollarInput
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="payment_method"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Method</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-wrap gap-4"
                >
                  {[
                    { value: "CASH", label: "Cash" },
                    { value: "CARD", label: "Card" },
                    { value: "TRANSFER", label: "Transfer" },
                    { value: "OTHER", label: "Other" },
                  ].map((method) => (
                    <div key={method.value} className="flex items-center gap-2">
                      <RadioGroupItem
                        value={method.value}
                        id={`method-${method.value}`}
                      />
                      <Label
                        htmlFor={`method-${method.value}`}
                        className="cursor-pointer font-normal"
                      >
                        {method.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-6 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="payment_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reference_note"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reference Note</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Optional note or reference"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex items-center gap-4 pt-4">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            Record Payment
          </Button>
          <Button variant="outline" type="button" asChild>
            <Link href={prefill ? "/dashboard/calendar" : "/dashboard/payments"}>Cancel</Link>
          </Button>
        </div>
      </form>
    </Form>
  )
}
