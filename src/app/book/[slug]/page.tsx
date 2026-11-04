import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { cache } from "react"
import { MapPin, Phone } from "lucide-react"
import { BookingFlow } from "@/components/booking/booking-flow"
import { PoweredBy } from "@/components/booking/powered-by"
import { formatPhone } from "@/lib/utils"
import { NotFoundError } from "@/server/errors"
import { getPublicBusiness } from "@/server/services/online-booking"

// Shared by generateMetadata and the page within one request
const load = cache(async (slug: string) => {
  try {
    return await getPublicBusiness(slug)
  } catch (err) {
    if (err instanceof NotFoundError) notFound()
    throw err
  }
})

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const business = await load((await params).slug)
  return {
    title: `Book at ${business.name}`,
    description: business.welcomeMessage || `Book your appointment at ${business.name} online.`,
  }
}

export default async function BookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const business = await load((await params).slug)

  return (
    <div className="min-h-screen bg-spa-surface">
      <header className="bg-gradient-to-br from-spa-primary to-spa-accent px-4 pb-16 pt-10 text-white">
        <div className="mx-auto max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wider text-white/70">Book online</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{business.name}</h1>
          {business.welcomeMessage && <p className="mt-3 max-w-xl text-white/85">{business.welcomeMessage}</p>}
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/80">
            {business.address && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {business.address}
              </span>
            )}
            {business.phone && (
              <a href={`tel:${business.phone}`} className="flex items-center gap-1.5 hover:text-white">
                <Phone className="h-4 w-4" />
                {formatPhone(business.phone)}
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto -mt-10 max-w-2xl px-4 pb-12">
        {business.accepting ? (
          <BookingFlow business={business} />
        ) : (
          <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
            <h2 className="text-lg font-semibold">Online booking is paused</h2>
            <p className="mt-2 text-muted-foreground">
              {business.name} isn&apos;t taking online bookings right now.
              {business.phone && <> Please call {formatPhone(business.phone)} to book.</>}
            </p>
          </div>
        )}
        <PoweredBy />
      </main>
    </div>
  )
}
