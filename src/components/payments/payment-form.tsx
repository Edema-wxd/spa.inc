"use client"

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
import { clients, users, services } from "@/lib/mock-data"
import { formatCurrency } from "@/lib/utils"
import { apiFetch } from "@/lib/api-client"
import { paymentSchema, type PaymentInput } from "@/lib/validation/payments"

type PaymentFormValues = PaymentInput

const today = new Date().toISOString().split("T")[0]

const staffMembers = users.filter(
  (u) => u.role === "STAFF" && u.is_active
)

const activeServices = services.filter((s) => s.is_active)

export function PaymentForm() {
  const router = useRouter()

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      client_id: "",
      staff_id: "",
      service_id: "",
      amount: 0,
      payment_method: "CASH",
      payment_date: today,
      reference_note: "",
    },
  })

  async function onSubmit(data: PaymentFormValues) {
    try {
      await apiFetch("/api/payments", { method: "POST", body: data })
      toast.success("Payment recorded successfully")
      router.push("/dashboard/payments")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not record payment")
    }
  }

  function handleServiceChange(serviceId: string) {
    form.setValue("service_id", serviceId)
    const service = services.find((s) => s.id === serviceId)
    if (service) {
      form.setValue("amount", service.default_price)
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
                        {service.name} ({formatCurrency(service.default_price)})
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
                <FormLabel>Amount (in cents)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g. 8500 for $85.00"
                    value={field.value || ""}
                    onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                </FormControl>
                {field.value > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(field.value)}
                  </p>
                )}
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
            <Link href="/dashboard/payments">Cancel</Link>
          </Button>
        </div>
      </form>
    </Form>
  )
}
