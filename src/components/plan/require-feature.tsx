import { hasFeature, minimumPlanFor, type Feature } from "@/lib/plans"
import { getCurrentPlan } from "@/server/context"
import { FEATURE_UPSELL } from "@/components/plan/feature-copy"
import { UpgradePrompt } from "@/components/plan/upgrade-prompt"

/**
 * Server-side page gate, used from route segment layouts. Nothing inside
 * renders (or loads its data) unless the plan includes `feature`.
 */
export async function RequireFeature({
  feature,
  children,
}: {
  feature: Feature
  children: React.ReactNode
}) {
  if (hasFeature(await getCurrentPlan(), feature)) return children
  return <UpgradePrompt {...FEATURE_UPSELL[feature]} requiredPlan={minimumPlanFor(feature)} />
}
