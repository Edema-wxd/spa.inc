import Link from "next/link"
import { FileSearch } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  title?: string
  description?: string
  icon?: React.ReactNode
  action?: { label: string; href: string }
  /** Smaller spacing for use inside cards and charts */
  compact?: boolean
  className?: string
}

export function EmptyState({
  title = "No results found",
  description = "Try adjusting your search or filters.",
  icon,
  action,
  compact,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-10" : "py-16",
        className
      )}
    >
      <div className="text-muted-foreground/30">
        {icon || <FileSearch className={compact ? "h-10 w-10" : "h-16 w-16"} />}
      </div>
      <h3 className={cn("mt-4 font-semibold text-foreground", compact ? "text-base" : "text-lg")}>
        {title}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && (
        <Button asChild size="sm" className="mt-4">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      )}
    </div>
  )
}
