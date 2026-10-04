"use client"

import { appointments } from "@/lib/mock-data"
import { getServiceById, getStaffById } from "@/lib/mock-data"
import { formatDateTime, formatCurrency } from "@/lib/utils"
import { StatusBadge } from "@/components/shared/status-badge"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import { CalendarX, Clock, Star } from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"

interface VisitHistoryProps {
  clientId: string
}

export function VisitHistory({ clientId }: VisitHistoryProps) {
  const clientAppointments = appointments
    .filter((a) => a.client_id === clientId)
    .sort(
      (a, b) =>
        new Date(b.scheduled_at).getTime() -
        new Date(a.scheduled_at).getTime()
    )
    .slice(0, 20)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visit History</CardTitle>
      </CardHeader>
      <CardContent>
        {clientAppointments.length === 0 ? (
          <EmptyState
            compact
            icon={<CalendarX className="h-10 w-10" />}
            title="No visits yet"
            description="Appointments for this client will build up a visit timeline here."
          />
        ) : (
          <div className="relative space-y-0">
            {clientAppointments.map((apt, index) => {
              const service = getServiceById(apt.service_id)
              const staff = getStaffById(apt.staff_id)

              return (
                <div key={apt.id} className="relative flex gap-4 pb-6 last:pb-0">
                  {/* Timeline line */}
                  {index < clientAppointments.length - 1 && (
                    <div className="absolute left-[7px] top-4 h-full w-px bg-border" />
                  )}

                  {/* Timeline dot */}
                  <div className="relative z-10 mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-primary bg-background" />

                  {/* Content */}
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium leading-none">
                        {service?.name || "Unknown Service"}
                      </p>
                      <StatusBadge status={apt.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(apt.scheduled_at)}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>with {staff?.full_name || "Unknown"}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {apt.duration_minutes} min
                      </span>
                      <span>{service ? formatCurrency(service.default_price) : "--"}</span>
                    </div>
                    {apt.satisfaction_rating !== null && (
                      <div className="flex items-center gap-1 pt-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${
                              i < apt.satisfaction_rating!
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
