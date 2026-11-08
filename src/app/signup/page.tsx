import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { AuthShell } from "@/components/auth/auth-shell"
import { SignupForm } from "@/components/auth/signup-form"
import { FREE_TRIAL_DAYS } from "@/lib/pricing"
import { SIGNUP_PLANS } from "@/lib/validation/accounts"
import { demoAllowed } from "@/server/auth/config"
import { getSessionContext } from "@/server/context"

export const metadata: Metadata = {
  title: "Start your free trial | Spa.Inc",
  description: `Try Spa.Inc free for ${FREE_TRIAL_DAYS} days: booking calendar, online booking, deposits and WhatsApp reminders.`,
}

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan } = await searchParams
  if (plan === "enterprise") redirect("/contact-sales?plan=enterprise")
  // A demo visitor can start a real trial from here; a real account goes to its dashboard
  const ctx = await getSessionContext()
  if (ctx && !ctx.isDemo) redirect("/dashboard")
  const initialPlan = SIGNUP_PLANS.find((p) => p === plan) ?? "manager"

  return (
    <AuthShell
      wide
      title={`Start your ${FREE_TRIAL_DAYS}-day free trial`}
      subtitle="Set up your spa in a few minutes: add your treatments and hours, share your booking link, take bookings."
    >
      <SignupForm initialPlan={initialPlan} />
      {demoAllowed() && (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Just looking?{" "}
          <a href="/demo" className="font-medium text-spa-accent hover:underline">
            Explore a demo spa first
          </a>
        </p>
      )}
    </AuthShell>
  )
}
