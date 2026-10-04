"use client"

import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import {
  PLAN_NAMES,
  formatCount,
  minimumPlanForCount,
  type LimitedResource,
} from "@/lib/plans"
import { usePlan } from "@/components/plan/plan-provider"

/** Warns when a limited resource is full (or over, after a downgrade). */
export function LimitBanner({ resource }: { resource: LimitedResource }) {
  const { usage, canAdd } = usePlan()
  const { used, limit } = usage[resource]
  if (canAdd(resource) || limit === null) return null

  const nextPlan = PLAN_NAMES[minimumPlanForCount(resource, used + 1)]

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          {used > limit
            ? `You have ${formatCount(resource, used)}, above your plan's limit of ${limit}. You can't add more until you upgrade.`
            : `You've reached your plan's limit of ${formatCount(resource, limit)}.`}{" "}
          Upgrade to {nextPlan} for more.
        </span>
      </p>
      <Link
        href="/dashboard/settings?tab=plan"
        className="shrink-0 font-semibold text-amber-900 underline underline-offset-4"
      >
        Upgrade plan
      </Link>
    </div>
  )
}
