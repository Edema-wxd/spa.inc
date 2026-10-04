import { RESOURCE_LABELS, formatLimit, type LimitedResource } from "@/lib/plans"
import { cn } from "@/lib/utils"

interface UsageMeterProps {
  resource: LimitedResource
  used: number
  limit: number | null
  className?: string
}

export function UsageMeter({ resource, used, limit, className }: UsageMeterProps) {
  const pct = limit === null ? 0 : Math.min(100, Math.round((used / limit) * 100))
  const atLimit = limit !== null && used >= limit

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{RESOURCE_LABELS[resource]}</span>
        <span className={cn("tabular-nums", atLimit ? "text-destructive" : "text-muted-foreground")}>
          {used.toLocaleString("en-US")} / {formatLimit(limit)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            limit === null ? "w-full bg-emerald-500/40" : atLimit ? "bg-destructive" : "bg-spa-accent"
          )}
          style={limit === null ? undefined : { width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
