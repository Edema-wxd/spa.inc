import Link from "next/link"
import { ArrowLeft, Users } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PaymentForm } from "@/components/payments/payment-form"
import { EmptyState } from "@/components/shared/empty-state"
import { clients } from "@/lib/mock-data"

export default function NewPaymentPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon-sm" asChild>
          <Link href="/dashboard/payments">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <PageHeader
          title="Record Payment"
          description="Log a new payment transaction"
        />
      </div>
      <Card>
        <CardContent>
          {clients.length === 0 ? (
            <EmptyState
              icon={<Users className="h-12 w-12" />}
              title="Add a client first"
              description="Payments are recorded against a client. Add your first client to get started."
              action={{ label: "Add Client", href: "/dashboard/clients/new" }}
            />
          ) : (
            <PaymentForm />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
