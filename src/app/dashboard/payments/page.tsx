import { PageHeader } from "@/components/shared/page-header"
import { CreditCard } from "lucide-react"
import { DataTable } from "@/components/shared/data-table"
import { EmptyState } from "@/components/shared/empty-state"
import { paymentColumns, type EnrichedPayment } from "@/components/payments/payment-columns"
import { payments, getClientById } from "@/lib/mock-data"

export default function PaymentsPage() {
  const enrichedPayments: EnrichedPayment[] = payments.map((p) => ({
    ...p,
    client_name: getClientById(p.client_id)?.full_name || "Unknown",
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Track all payment transactions"
        action={{
          label: "Record Payment",
          href: "/dashboard/payments/new",
        }}
      />
      <DataTable
        columns={paymentColumns}
        data={enrichedPayments}
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
    </div>
  )
}
