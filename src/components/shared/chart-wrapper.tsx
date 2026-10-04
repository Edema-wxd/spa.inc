import { BarChart3 } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { EmptyState } from "@/components/shared/empty-state"
import { cn } from "@/lib/utils"

interface ChartWrapperProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
  /** Render an empty state instead of the chart */
  isEmpty?: boolean
  emptyTitle?: string
  emptyDescription?: string
  emptyIcon?: React.ReactNode
  emptyAction?: { label: string; href: string }
}

export function ChartWrapper({
  title,
  description,
  children,
  className,
  isEmpty,
  emptyTitle = "No data yet",
  emptyDescription = "This chart fills in as you record activity.",
  emptyIcon,
  emptyAction,
}: ChartWrapperProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <EmptyState
            compact
            icon={emptyIcon ?? <BarChart3 className="h-10 w-10" />}
            title={emptyTitle}
            description={emptyDescription}
            action={emptyAction}
            className="min-h-[260px]"
          />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}
