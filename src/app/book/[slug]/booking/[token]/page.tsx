import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { CalendarCheck, CalendarDays, CalendarX, Clock, CreditCard, MapPin, Phone, Sparkles, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ManageActions } from "@/components/booking/manage-actions"
import { PoweredBy } from "@/components/booking/powered-by"
import { formatPhone } from "@/lib/utils"
import { NotFoundError } from "@/server/errors"
import { getPublicBooking } from "@/server/services/online-booking"

export const metadata: Metadata = { title: "Your booking", robots: { index: false } }

export default async function ManageBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; token: string }>
  searchParams: Promise<{ reference?: string; trxref?: string; session_id?: string }>
}) {
  const { slug, token } = await params
  const query = await searchParams
  // Returning from Paystack or Stripe: check with the provider before showing the status
  const checkPayment = Boolean(query.reference || query.trxref || query.session_id)
  const booking = await getPublicBooking(slug, token, { checkPayment }).catch((err) => {
    if (err instanceof NotFoundError) notFound()
    throw err
  })

  const { status, deposit } = booking
  const hero =
    status === "PENDING_DEPOSIT"
      ? { icon: CreditCard, title: "Almost done", text: `Pay your ${deposit?.amountLabel} deposit to confirm this time.`, tone: "bg-amber-50 text-amber-900" }
      : status === "SCHEDULED"
        ? { icon: CalendarCheck, title: "You're booked", text: booking.confirmed ? "Thanks for confirming. See you soon." : "We've saved your spot. See you soon.", tone: "bg-emerald-50 text-emerald-900" }
        : status === "CANCELLED"
          ? { icon: CalendarX, title: "This booking is cancelled", text: deposit?.status === "REFUNDED" ? `Your ${deposit.amountLabel} deposit was refunded.` : deposit?.status === "FORFEITED" ? `The ${deposit.amountLabel} deposit was kept under the cancellation policy.` : deposit?.status === "EXPIRED" ? "The deposit wasn't paid in time, so the time was released." : "", tone: "bg-gray-100 text-gray-800" }
          : { icon: CalendarDays, title: "This appointment has passed", text: "Thanks for visiting.", tone: "bg-spa-50 text-spa-900" }

  return (
    <div className="min-h-screen bg-spa-surface px-4 py-10">
      <main className="mx-auto max-w-lg">
        <p className="text-center text-sm font-medium text-muted-foreground">{booking.business.name}</p>
        <div className="mt-3 overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className={`flex items-start gap-3 p-5 ${hero.tone}`}>
            <hero.icon className="mt-0.5 h-6 w-6 shrink-0" />
            <div>
              <h1 className="text-xl font-semibold">{hero.title}</h1>
              {hero.text && <p className="mt-1 text-sm opacity-90">{hero.text}</p>}
            </div>
          </div>

          <dl className="space-y-3 p-5 text-sm">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <dt className="sr-only">Treatment</dt>
                <dd className="font-semibold">{booking.serviceName}</dd>
                <dd className="text-muted-foreground">
                  {booking.duration} min{booking.priceLabel && `, ${booking.priceLabel}`}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <dt className="sr-only">When</dt>
                <dd className="font-medium">{booking.dateLabel}</dd>
                <dd className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {booking.timeLabel}
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <dt className="sr-only">Therapist</dt>
                <dd>with {booking.staffName}</dd>
              </div>
            </div>
            {booking.business.address && (
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <dd>{booking.business.address}</dd>
              </div>
            )}
            {deposit && deposit.status === "PAID" && (
              <div className="flex items-start gap-3">
                <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <dd>{deposit.amountLabel} deposit paid, it comes off your bill.</dd>
              </div>
            )}
          </dl>

          <div className="border-t p-5">
            <ManageActions booking={booking} />
          </div>
        </div>

        <p className="mt-4 px-2 text-center text-xs text-muted-foreground">{booking.policy}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {booking.business.phone && (
            <Button asChild variant="ghost" size="sm">
              <a href={`tel:${booking.business.phone}`}>
                <Phone className="h-4 w-4" />
                Call {formatPhone(booking.business.phone)}
              </a>
            </Button>
          )}
          <Button asChild variant="ghost" size="sm">
            <Link href={`/book/${booking.business.slug}`}>Book another visit</Link>
          </Button>
        </div>
        <PoweredBy />
      </main>
    </div>
  )
}
