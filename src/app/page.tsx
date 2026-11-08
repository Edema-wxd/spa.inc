import Link from "next/link"
import { BellRing, CalendarCheck, CreditCard, Globe, LineChart, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FREE_TRIAL_DAYS } from "@/lib/pricing"
import { demoAllowed } from "@/server/auth/config"

const features = [
  {
    icon: Globe,
    title: "Online booking, 24/7",
    description: "Your own booking page for Instagram and WhatsApp. Clients only see times that are really free.",
  },
  {
    icon: CreditCard,
    title: "Deposits that stop no-shows",
    description: "Take a small deposit by card or Paystack. Late cancellations and no-shows keep it.",
  },
  {
    icon: BellRing,
    title: "WhatsApp reminders",
    description: "A reminder the day before. Clients reply 1 to confirm, and you see it on the calendar.",
  },
  {
    icon: CalendarCheck,
    title: "A calendar that can't double-book",
    description: "Every therapist's hours and bookings in one view, with clash checks built in.",
  },
  {
    icon: LineChart,
    title: "Know your numbers",
    description: "Revenue, therapist performance, expenses and profit, without a spreadsheet.",
  },
]

export default function LandingPage() {
  const demo = demoAllowed()
  return (
    <div className="min-h-screen bg-gradient-to-br from-spa-primary to-spa-accent px-4 py-12 text-white sm:py-20">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-xl font-bold">
            <Sparkles className="h-6 w-6" />
            Spa.Inc
          </span>
          <nav className="flex items-center gap-1 text-sm">
            <Button asChild variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white">
              <Link href="/pricing">Pricing</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white">
              <Link href="/login">Sign in</Link>
            </Button>
          </nav>
        </header>

        <section className="mx-auto mt-16 max-w-3xl text-center sm:mt-24">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Fill your calendar. Cut no-shows. Get paid.</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/85">
            Booking software for spas and massage therapists: an online booking page with deposits, WhatsApp reminders,
            and a dashboard that shows how the business is really doing.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-white text-spa-primary hover:bg-white/90">
              <Link href="/signup">Start {FREE_TRIAL_DAYS}-day free trial</Link>
            </Button>
            {demo && (
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <a href="/demo">Explore the demo</a>
              </Button>
            )}
          </div>
          <p className="mt-3 text-sm text-white/70">No card needed. Set up in about 10 minutes.</p>
        </section>

        <section className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Features">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-sm">
              <feature.icon className="h-6 w-6" />
              <h2 className="mt-3 text-lg font-semibold">{feature.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-white/75">{feature.description}</p>
            </div>
          ))}
          <div className="flex flex-col justify-center rounded-2xl bg-white p-6 text-spa-primary">
            <h2 className="text-lg font-semibold">Pricing from $19 a month</h2>
            <p className="mt-1 text-sm text-spa-primary/80">Paid in naira in Nigeria. Every plan starts with the full product.</p>
            <Link href="/pricing" className="mt-3 text-sm font-semibold underline">
              Compare plans
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
