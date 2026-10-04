import Link from "next/link"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PLAN_NAMES, type TierId } from "@/lib/plans"
import { cn } from "@/lib/utils"

interface UpgradePromptProps {
  title: string
  description: string
  requiredPlan: TierId
  compact?: boolean
  className?: string
}

/** Shown in place of a feature the organization's plan does not include. */
export function UpgradePrompt({
  title,
  description,
  requiredPlan,
  compact,
  className,
}: UpgradePromptProps) {
  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent
        className={cn(
          "flex flex-col items-center text-center",
          compact ? "gap-3 py-8" : "gap-4 py-16"
        )}
      >
        <div className="rounded-full bg-spa-50 p-3">
          <Lock className={cn("text-spa-accent", compact ? "h-5 w-5" : "h-7 w-7")} />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-spa-accent">
            {PLAN_NAMES[requiredPlan]} plan and above
          </p>
          <h2 className={cn("font-semibold", compact ? "text-base" : "text-xl")}>{title}</h2>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild size={compact ? "sm" : "default"}>
            <Link href="/dashboard/settings?tab=plan">Upgrade plan</Link>
          </Button>
          <Button asChild variant="outline" size={compact ? "sm" : "default"}>
            <Link href="/pricing">Compare plans</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
