"use client"

import { appointments, payments } from "@/lib/mock-data"
import { formatCurrency, formatDate } from "@/lib/utils"
import { getClientById } from "@/lib/mock-data"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card"
import { CalendarDays, DollarSign, TrendingUp, Star, UserPlus } from "lucide-react"

interface ClientStatsProps {
  clientId: string
}

export function ClientStats({ clientId }: ClientStatsProps) {
  const client = getClientById(clientId)

  const clientAppointments = appointments.filter(
    (a) => a.client_id === clientId
  )
  const totalVisits = clientAppointments.length

  const completedPayments = payments.filter(
    (p) => p.client_id === clientId && p.status === "COMPLETED"
  )
  const totalSpent = completedPayments.reduce((sum, p) => sum + p.amount, 0)

  const averagePerVisit = totalVisits > 0 ? Math.round(totalSpent / totalVisits) : 0

  const ratingsArr = clientAppointments
    .filter((a) => a.satisfaction_rating !== null)
    .map((a) => a.satisfaction_rating as number)
  const averageSatisfaction =
    ratingsArr.length > 0
      ? Math.round((ratingsArr.reduce((s, r) => s + r, 0) / ratingsArr.length) * 10) / 10
      : null

  const stats = [
    {
      label: "Total Visits",
      value: totalVisits.toString(),
      icon: CalendarDays,
    },
    {
      label: "Total Spent",
      value: formatCurrency(totalSpent),
      icon: DollarSign,
    },
    {
      label: "Average per Visit",
      value: formatCurrency(averagePerVisit),
      icon: TrendingUp,
    },
    {
      label: "Avg. Satisfaction",
      value: averageSatisfaction !== null ? `${averageSatisfaction} / 5` : "No ratings",
      icon: Star,
    },
    {
      label: "Member Since",
      value: client ? formatDate(client.created_at) : "--",
      icon: UserPlus,
    },
  ]

  return (
    <div className="space-y-3">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="pt-0">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-sm font-semibold">{stat.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
