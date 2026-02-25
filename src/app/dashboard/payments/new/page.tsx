import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PaymentForm } from "@/components/payments/payment-form"

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
          <PaymentForm />
        </CardContent>
      </Card>
    </div>
  )
}
