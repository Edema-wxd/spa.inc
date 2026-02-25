"use client"

import { Card, CardContent } from "@/components/ui/card"
import { schedules } from "@/lib/mock-data"
import { formatTime } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface ScheduleGridProps {
  staffId: string
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
// day_of_week in data: 0=Sunday, 1=Monday, ..., 6=Saturday
// We want to display Mon-Sun, so the mapping is:
// Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6, Sun=0
const DAY_INDICES = [1, 2, 3, 4, 5, 6, 0]

export function ScheduleGrid({ staffId }: ScheduleGridProps) {
  const staffSchedules = schedules.filter((s) => s.staff_id === staffId)

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      {DAY_NAMES.map((dayName, index) => {
        const dayIndex = DAY_INDICES[index]
        const schedule = staffSchedules.find(
          (s) => s.day_of_week === dayIndex && s.is_available
        )

        const isAvailable = !!schedule

        return (
          <Card
            key={dayName}
            className={cn(
              "transition-colors",
              isAvailable
                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
                : "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950/30"
            )}
          >
            <CardContent className="p-4 text-center">
              <p
                className={cn(
                  "text-sm font-semibold",
                  isAvailable
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-gray-500 dark:text-gray-400"
                )}
              >
                {dayName}
              </p>
              {isAvailable ? (
                <div className="mt-2 space-y-1">
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-300">
                    {formatTime(schedule.start_time)}
                  </p>
                  <p className="text-xs text-muted-foreground">to</p>
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-300">
                    {formatTime(schedule.end_time)}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Off</p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
