import Link from "next/link"
import { RANGE_PRESETS, type RangePreset } from "@/lib/ranges"
import { cn } from "@/lib/utils"

/** Period switcher for report pages; each option is a plain link (`?range=`). */
export function RangeTabs({ basePath, active }: { basePath: string; active: RangePreset }) {
  return (
    <nav aria-label="Reporting period" className="inline-flex rounded-lg border bg-muted p-1 text-sm">
      {RANGE_PRESETS.map((preset) => (
        <Link
          key={preset.id}
          href={`${basePath}?range=${preset.id}`}
          aria-current={preset.id === active ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-1.5 font-medium text-muted-foreground transition-colors hover:text-foreground",
            preset.id === active && "bg-background text-foreground shadow-sm"
          )}
        >
          {preset.label}
        </Link>
      ))}
    </nav>
  )
}
