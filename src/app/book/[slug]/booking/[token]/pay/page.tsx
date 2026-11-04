import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { FlaskConical } from "lucide-react"
import { DemoPayButton } from "@/components/booking/demo-pay-button"
import { NotFoundError } from "@/server/errors"
import { getPublicBooking } from "@/server/services/online-booking"

export const metadata: Metadata = { title: "Pay deposit", robots: { index: false } }

/** Stand-in checkout used only when no payment provider is configured. */
export default async function DemoCheckoutPage({ params }: { params: Promise<{ slug: string; token: string }> }) {
  const { slug, token } = await params
  const booking = await getPublicBooking(slug, token).catch((err) => {
    if (err instanceof NotFoundError) notFound()
    throw err
  })
  const manage = `/book/${slug}/booking/${token}`
  if (booking.status !== "PENDING_DEPOSIT" || !booking.deposit?.isDemo) redirect(manage)

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <main className="mx-auto max-w-sm rounded-2xl border bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Demo checkout. No money moves. With Stripe or Paystack keys configured, clients pay on the provider&apos;s
            secure page instead.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">{booking.business.name}</p>
        <h1 className="mt-1 text-2xl font-semibold">{booking.deposit.amountLabel}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Deposit for {booking.serviceName}, {booking.dateLabel}, {booking.timeLabel}
        </p>
        <DemoPayButton slug={slug} token={token} amountLabel={booking.deposit.amountLabel} manageHref={manage} />
      </main>
    </div>
  )
}
