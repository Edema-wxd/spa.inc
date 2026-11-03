import { CalendarX, Clock, MapPin, Star } from "lucide-react"
import { StatusBadge } from "@/components/shared/status-badge"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { EmptyState } from "@/components/shared/empty-state"
import { formatDateTimeInZone } from "@/lib/time"
import { formatCurrency } from "@/lib/utils"
import type { ClientVisit } from "@/server/services/clients"

function Timeline({ visits, timezone }: { visits: ClientVisit[]; timezone: string }) {
  return (
    <div className="relative space-y-0">
      {visits.map((visit, index) => (
        <div key={visit.id} className="relative flex gap-4 pb-6 last:pb-0">
          {index < visits.length - 1 && <div className="absolute left-[7px] top-4 h-full w-px bg-border" />}
          <div className="relative z-10 mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-primary bg-background" />
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium leading-none">{visit.service_name}</p>
              <StatusBadge status={visit.status} />
            </div>
            <p className="text-sm text-muted-foreground">{formatDateTimeInZone(visit.scheduled_at, timezone)}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>with {visit.staff_name}</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {visit.duration_minutes} min
              </span>
              {visit.location_type === "REMOTE" && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  Mobile visit
                </span>
              )}
              {visit.amount_paid !== null && <span>Paid {formatCurrency(visit.amount_paid)}</span>}
            </div>
            {visit.notes && <p className="text-sm italic text-muted-foreground">{visit.notes}</p>}
            {visit.satisfaction_rating !== null && (
              <div className="flex items-center gap-1 pt-0.5" aria-label={`Rated ${visit.satisfaction_rating} out of 5`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3.5 w-3.5 ${
                      i < visit.satisfaction_rating! ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export function VisitHistory({
  upcoming,
  past,
  timezone,
}: {
  upcoming: ClientVisit[]
  past: ClientVisit[]
  timezone: string
}) {
  return (
    <>
      {upcoming.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming</CardTitle>
            <CardDescription>
              {upcoming.length} booked appointment{upcoming.length === 1 ? "" : "s"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Timeline visits={upcoming} timezone={timezone} />
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Visit History</CardTitle>
          {past.length > 20 && <CardDescription>Showing the 20 most recent of {past.length}</CardDescription>}
        </CardHeader>
        <CardContent>
          {past.length === 0 ? (
            <EmptyState
              compact
              icon={<CalendarX className="h-10 w-10" />}
              title="No visits yet"
              description="Completed, cancelled and missed appointments will build up a timeline here."
            />
          ) : (
            <Timeline visits={past.slice(0, 20)} timezone={timezone} />
          )}
        </CardContent>
      </Card>
    </>
  )
}
