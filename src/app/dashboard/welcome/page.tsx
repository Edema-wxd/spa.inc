import { redirect } from "next/navigation"
import { PageHeader } from "@/components/shared/page-header"
import { WelcomeChecklist } from "@/components/onboarding/welcome-checklist"
import { getPageContext } from "@/server/context"
import { getOnboarding } from "@/server/services/onboarding"

export default async function WelcomePage() {
  const ctx = await getPageContext()
  if (ctx.role !== "ADMIN") redirect("/dashboard/calendar")
  const state = await getOnboarding(ctx)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={state.ownerFirstName ? `Welcome, ${state.ownerFirstName}` : "Welcome"}
        description={`Four steps to get ${state.business.name} taking bookings. Most people finish in under 10 minutes.`}
      />
      <WelcomeChecklist state={state} />
    </div>
  )
}
