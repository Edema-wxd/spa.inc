"use client"

import Link from "next/link"
import { Lock, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { RESOURCE_LABELS, type LimitedResource } from "@/lib/plans"
import { usePlan } from "@/components/plan/plan-provider"

/** "Add" button that locks itself once the plan limit is reached. */
export function AddResourceButton({
  resource,
  label,
  href,
}: {
  resource: LimitedResource
  label: string
  href: string
}) {
  const { canAdd } = usePlan()

  if (canAdd(resource)) {
    return (
      <Button asChild>
        <Link href={href}>
          <Plus className="h-4 w-4" />
          {label}
        </Link>
      </Button>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* span keeps the tooltip working on a disabled button */}
        <span tabIndex={0}>
          <Button disabled>
            <Lock className="h-4 w-4" />
            {label}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {RESOURCE_LABELS[resource]} limit reached. Upgrade your plan to add more.
      </TooltipContent>
    </Tooltip>
  )
}
