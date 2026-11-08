"use client"

import Link from "next/link"
import { Sparkles } from "lucide-react"
import { usePlan } from "@/components/plan/plan-provider"
import { useSessionUser } from "@/components/layout/session-user"

/** One line above the header: "this is the demo", or the trial countdown near its end. */
export function AccountBanner() {
  const { isDemo, trial } = usePlan()
  const user = useSessionUser()

  if (isDemo) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-spa-primary px-4 py-2 text-center text-sm text-white">
        <Sparkles className="h-4 w-4 shrink-0" />
        <span>You&apos;re exploring Juniper Day Spa, a demo with a year of sample data.</span>
        <Link href="/signup" className="font-semibold underline underline-offset-2 hover:text-spa-100">
          Start your free trial
        </Link>
      </div>
    )
  }
  // Only nag in the last few days, and only admins (they choose the plan)
  if (trial && trial.daysLeft <= 3 && user.role === "ADMIN") {
    return (
      <div className="bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">
        Your full trial ends in {trial.daysLeft} day{trial.daysLeft === 1 ? "" : "s"}. After that you&apos;ll be on{" "}
        {trial.chosenPlanName}.{" "}
        <Link href="/dashboard/settings?tab=plan" className="font-semibold underline underline-offset-2">
          Review your plan
        </Link>
      </div>
    )
  }
  return null
}
