"use client"

import { createContext, useContext } from "react"
import {
  canAdd,
  hasFeature,
  type Feature,
  type LimitedResource,
  type PlanUsage,
  type TierId,
} from "@/lib/plans"

const PlanContext = createContext<PlanUsage | null>(null)

/** Provided by the dashboard layout from the server-side plan + usage. */
export function PlanProvider({ value, children }: { value: PlanUsage; children: React.ReactNode }) {
  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>
}

export function usePlan() {
  const value = useContext(PlanContext)
  if (!value) throw new Error("usePlan must be used inside <PlanProvider>")
  const plan: TierId = value.plan
  return {
    ...value,
    hasFeature: (feature: Feature) => hasFeature(plan, feature),
    canAdd: (resource: LimitedResource) => canAdd(plan, resource, value.usage[resource].used),
  }
}
