import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { type LucideIcon } from "lucide-react"

interface SummaryCardProps {
  title: string
  value: string
  change?: string
  changeType?: "positive" | "negative" | "neutral"
  icon: LucideIcon
  description?: string
}

export function SummaryCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  description,
}: SummaryCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className="rounded-full bg-spa-light p-2">
            <Icon className="h-5 w-5 text-spa-accent" />
          </div>
        </div>
        {(change || description) && (
          <div className="mt-3 flex items-center gap-1.5">
            {change && (
              <span
                className={cn(
                  "text-sm font-medium",
                  changeType === "positive" && "text-emerald-600",
                  changeType === "negative" && "text-red-600",
                  changeType === "neutral" && "text-gray-500"
                )}
              >
                {change}
              </span>
            )}
            {description && (
              <span className="text-xs text-muted-foreground">
                {description}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
