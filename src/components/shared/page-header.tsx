import Link from "next/link"
import { Button } from "@/components/ui/button"
import { type LucideIcon, Plus } from "lucide-react"

interface PageHeaderProps {
  title: string
  description?: string
  action?: {
    label: string
    href: string
    icon?: LucideIcon
  }
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  const ActionIcon = action?.icon || Plus

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-muted-foreground">{description}</p>
        )}
      </div>
      {action && (
        <Button asChild>
          <Link href={action.href}>
            <ActionIcon className="h-4 w-4" />
            {action.label}
          </Link>
        </Button>
      )}
    </div>
  )
}
