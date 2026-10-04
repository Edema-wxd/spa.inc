import { Suspense } from "react"
import type { Metadata } from "next"
import { Building2, Headphones, LineChart } from "lucide-react"
import { SiteHeader } from "@/components/marketing/site-header"
import { ContactSalesForm } from "@/components/pricing/contact-sales-form"

export const metadata: Metadata = {
  title: "Contact Sales | Spa.Inc",
  description: "Get a custom Spa.Inc quote for multi-location spas and spa groups.",
}

const benefits = [
  {
    icon: Building2,
    title: "Built for multiple branches",
    description: "Manage every location from one account with per-branch and group-wide views.",
  },
  {
    icon: LineChart,
    title: "Consolidated reporting",
    description: "Compare revenue, expenses, and staff performance across all your locations.",
  },
  {
    icon: Headphones,
    title: "Guided onboarding",
    description: "We help migrate your client records and set up staff, services, and schedules.",
  },
]

export default function ContactSalesPage() {
  return (
    <div className="min-h-screen bg-spa-surface">
      <SiteHeader />

      <main className="mx-auto grid max-w-6xl gap-12 px-4 py-16 lg:grid-cols-5">
        <section className="space-y-8 lg:col-span-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-spa-accent">
              Enterprise & custom plans
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-spa-primary">
              Talk to our sales team
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Running several locations or need something tailored? Share a few
              details and we will prepare a custom quote for your business.
            </p>
          </div>

          <ul className="space-y-6">
            {benefits.map((benefit) => (
              <li key={benefit.title} className="flex gap-4">
                <div className="h-fit rounded-lg bg-spa-100 p-2.5">
                  <benefit.icon className="h-5 w-5 text-spa-primary" />
                </div>
                <div>
                  <h2 className="font-semibold">{benefit.title}</h2>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="lg:col-span-3">
          {/* useSearchParams in the form requires a Suspense boundary */}
          <Suspense>
            <ContactSalesForm />
          </Suspense>
        </section>
      </main>
    </div>
  )
}
