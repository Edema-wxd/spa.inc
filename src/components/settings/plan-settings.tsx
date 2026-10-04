"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { usePlan } from "@/components/plan/plan-provider"
import { UsageMeter } from "@/components/plan/usage-meter"
import { apiFetch } from "@/lib/api-client"
import {
  PLAN_LIMITS,
  PLAN_NAMES,
  TIER_IDS,
  formatLimit,
  type LimitedResource,
  type TierId,
} from "@/lib/plans"
import { pricingTiers } from "@/lib/pricing"
import { cn } from "@/lib/utils"

const RESOURCES: LimitedResource[] = ["clients", "admins", "locations"]

export function PlanSettings() {
  const router = useRouter()
  const { plan, planName, usage } = usePlan()
  const [pending, setPending] = useState<TierId | null>(null)

  async function switchPlan(next: TierId) {
    setPending(next)
    try {
      await apiFetch("/api/plan", { method: "PUT", body: { plan: next } })
      toast.success(`Switched to the ${PLAN_NAMES[next]} plan`)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change plan")
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Current plan
            <Badge className="bg-spa-accent text-white">{planName}</Badge>
          </CardTitle>
          <CardDescription>Usage against your plan&apos;s limits.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-3">
          {RESOURCES.map((resource) => (
            <UsageMeter key={resource} resource={resource} {...usage[resource]} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change plan</CardTitle>
          <CardDescription>
            Demo mode: switching is instant and free. Billing will replace this once it is set up.{" "}
            <Link href="/pricing" className="text-spa-accent hover:underline">
              Compare plans
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {TIER_IDS.map((tier) => {
            const isCurrent = tier === plan
            const overLimit = RESOURCES.filter((r) => {
              const limit = PLAN_LIMITS[tier][r]
              return limit !== null && usage[r].used > limit
            })
            const details = pricingTiers.find((t) => t.id === tier)!
            return (
              <div
                key={tier}
                className={cn(
                  "flex flex-col gap-3 rounded-lg border p-4",
                  isCurrent && "border-spa-accent ring-1 ring-spa-accent"
                )}
              >
                <div>
                  <p className="font-semibold">{PLAN_NAMES[tier]}</p>
                  <p className="text-xs text-muted-foreground">{details.audience}</p>
                </div>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>{formatLimit(PLAN_LIMITS[tier].clients)} clients</li>
                  <li>{formatLimit(PLAN_LIMITS[tier].admins)} admin accounts</li>
                  <li>{formatLimit(PLAN_LIMITS[tier].locations)} location(s)</li>
                </ul>
                {overLimit.length > 0 && !isCurrent && (
                  <p className="text-xs text-amber-700">
                    You are over this plan&apos;s {overLimit.join(" and ")} limit. Existing records stay,
                    but you won&apos;t be able to add more.
                  </p>
                )}
                <Button
                  className="mt-auto"
                  variant={isCurrent ? "secondary" : "outline"}
                  size="sm"
                  disabled={isCurrent || pending !== null}
                  onClick={() => switchPlan(tier)}
                >
                  {isCurrent ? (
                    <>
                      <Check className="h-4 w-4" /> Current plan
                    </>
                  ) : pending === tier ? (
                    "Switching..."
                  ) : (
                    `Switch to ${PLAN_NAMES[tier]}`
                  )}
                </Button>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
