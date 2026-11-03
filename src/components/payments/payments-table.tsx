"use client"

import { CreditCard } from "lucide-react"
import { DataTable } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { paymentColumns, type EnrichedPayment } from "@/components/payments/payment-columns"

export function PaymentsTable({ payments }: { payments: EnrichedPayment[] }) {
  return (
    <DataTable
      columns={paymentColumns}
      data={payments}
      searchKey="client_name"
      searchPlaceholder="Search by client name..."
      emptyState={
        <EmptyState
          icon={<CreditCard className="h-12 w-12" />}
          title="No payments yet"
          description="Record a payment after each session to track revenue and therapist earnings."
          action={{ label: "Record Payment", href: "/dashboard/payments/new" }}
        />
      }
    />
  )
}
