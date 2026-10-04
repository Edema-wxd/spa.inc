import { CalendarX, Clock, User, Scissors } from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { StatusBadge } from "@/components/shared/status-badge"
import { getUpcomingAppointments } from "@/lib/mock-data"
import { formatDateTime } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

const appointments = getUpcomingAppointments(5)

export function UpcomingAppointments() {
  if (appointments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            compact
            icon={<CalendarX className="h-10 w-10" />}
            title="No upcoming appointments"
            description="Scheduled appointments will appear here so you can plan the day ahead."
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Appointments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">
        {appointments.map((apt, index) => (
          <div key={apt.id}>
            {index > 0 && <Separator className="my-3" />}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {formatDateTime(apt.scheduled_at)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium">
                    {apt.clientName}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Scissors className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate text-muted-foreground">
                    {apt.serviceName}
                  </span>
                  <span className="text-muted-foreground">--</span>
                  <span className="truncate text-muted-foreground">
                    {apt.staffName}
                  </span>
                </div>
              </div>
              <StatusBadge status={apt.status} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
