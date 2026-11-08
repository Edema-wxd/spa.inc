import { PageHeader } from "@/components/shared/page-header"
import { PaymentsTable } from "@/components/payments/payments-table"
import { getPageContext } from "@/server/context"
import { listPaymentRows } from "@/server/services/payments"

export default async function PaymentsPage() {
  const payments = await listPaymentRows(await getPageContext())

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Every payment, newest first"
        action={{ label: "Record Payment", href: "/dashboard/payments/new" }}
      />
      <PaymentsTable payments={payments} />
    </div>
  )
}
