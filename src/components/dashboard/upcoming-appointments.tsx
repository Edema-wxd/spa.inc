import Link from "next/link"
import { CalendarX, Clock, User, Sparkles } from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/status-badge"
import { Separator } from "@/components/ui/separator"
import { formatDateTimeInZone } from "@/lib/time"
import type { DashboardOverview } from "@/server/services/dashboard"

export function UpcomingAppointments({
  appointments,
  timezone,
}: {
  appointments: DashboardOverview["upcoming"]
  timezone: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Upcoming Appointments</CardTitle>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/calendar">Open calendar</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-0">
        {appointments.length === 0 ? (
          <EmptyState
            compact
            icon={<CalendarX className="h-10 w-10" />}
            title="No upcoming appointments"
            description="Book appointments from the calendar to plan the day ahead."
            action={{ label: "Book an appointment", href: "/dashboard/calendar?book=1" }}
          />
        ) : (
          appointments.map((apt, index) => (
            <div key={apt.id}>
              {index > 0 && <Separator className="my-3" />}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">{formatDateTimeInZone(apt.scheduled_at, timezone)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate font-medium">{apt.clientName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {apt.serviceName} with {apt.staffName}
                    </span>
                  </div>
                </div>
                <StatusBadge status={apt.status} />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
