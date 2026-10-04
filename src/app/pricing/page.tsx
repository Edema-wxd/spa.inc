import type { Metadata } from "next"
import Link from "next/link"
import { Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/marketing/site-header"
import { PricingCards } from "@/components/pricing/pricing-cards"
import { ComparisonTable } from "@/components/pricing/comparison-table"
import { AddOnsGrid } from "@/components/pricing/add-ons-grid"
import { ANNUAL_DISCOUNT, FREE_TRIAL_DAYS } from "@/lib/pricing"
import { getPricingCurrency } from "@/lib/region"

export const metadata: Metadata = {
  title: "Pricing | Spa.Inc",
  description:
    "Simple plans for solo therapists, single-location spas, and multi-branch spa groups.",
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string }>
}) {
  const { region } = await searchParams
  const currency = await getPricingCurrency(region)

  return (
    <div className="min-h-screen bg-spa-surface">
      <SiteHeader />

      <main className="mx-auto max-w-6xl space-y-20 px-4 py-16">
        {/* Hero */}
        <section className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-spa-primary sm:text-5xl">
            Plans that grow with your spa
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Whether you work solo, run one location, or manage several branches,
            there is a plan for you. Save {Math.round(ANNUAL_DISCOUNT * 100)}% with
            annual billing, or try Essentials free for {FREE_TRIAL_DAYS} days.
          </p>
        </section>

        <section aria-label="Plans">
          <PricingCards currency={currency} />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {currency === "NGN" ? (
              <>
                Prices shown in Nigerian Naira.{" "}
                <Link href="/pricing?region=intl" className="text-spa-accent hover:underline">
                  View prices in USD
                </Link>
              </>
            ) : (
              <>
                Prices shown in US Dollars. Based in Nigeria?{" "}
                <Link href="/pricing?region=ng" className="text-spa-accent hover:underline">
                  View prices in NGN
                </Link>
              </>
            )}
          </p>
        </section>

        <section className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight">Compare plans</h2>
            <p className="mt-2 text-muted-foreground">
              Everything included in each tier, side by side.
            </p>
          </div>
          <ComparisonTable />
        </section>

        <section className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight">Add-ons</h2>
            <p className="mt-2 text-muted-foreground">
              Optional modules coming soon. Add them to any plan for a monthly fee.
            </p>
          </div>
          <AddOnsGrid currency={currency} />
        </section>

        {/* Sales CTA */}
        <section className="rounded-2xl bg-gradient-to-br from-spa-primary to-spa-accent px-6 py-12 text-center text-white">
          <Building2 className="mx-auto mb-4 h-10 w-10" />
          <h2 className="text-2xl font-bold tracking-tight">
            Running more than one location?
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-white/80">
            Talk to our team about Enterprise pricing, multi-branch setup, and
            migrating your existing client records.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-6 bg-white text-spa-primary hover:bg-white/90"
          >
            <Link href="/contact-sales?plan=enterprise">Contact sales</Link>
          </Button>
        </section>
      </main>
    </div>
  )
}
