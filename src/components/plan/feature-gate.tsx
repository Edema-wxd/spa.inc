"use client"

import { minimumPlanFor, type Feature } from "@/lib/plans"
import { usePlan } from "@/components/plan/plan-provider"
import { FEATURE_UPSELL } from "@/components/plan/feature-copy"
import { UpgradePrompt } from "@/components/plan/upgrade-prompt"

/** Client-side gate for widgets inside an otherwise available page. */
export function FeatureGate({
  feature,
  children,
  className,
}: {
  feature: Feature
  children: React.ReactNode
  className?: string
}) {
  const { hasFeature } = usePlan()
  if (hasFeature(feature)) return children
  return (
    <UpgradePrompt
      {...FEATURE_UPSELL[feature]}
      requiredPlan={minimumPlanFor(feature)}
      className={className}
      compact
    />
  )
}
