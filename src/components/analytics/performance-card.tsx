import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatCurrency, getInitials } from "@/lib/utils"
import { Star, TrendingUp, Calendar, XCircle } from "lucide-react"

interface PerformanceCardProps {
  staff: {
    staffId: string
    name: string
    totalAppointments: number
    completedAppointments: number
    totalRevenue: number
    averageRating: number
    cancelRate: number
  }
  rank: number
}

export function PerformanceCard({ staff, rank }: PerformanceCardProps) {
  const avgPerSession =
    staff.completedAppointments > 0
      ? staff.totalRevenue / staff.completedAppointments
      : 0

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <Avatar size="lg">
            <AvatarFallback className="bg-spa-light text-spa-accent text-sm font-semibold">
              {getInitials(staff.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold truncate">{staff.name}</h3>
              {rank <= 3 && (
                <span className="text-xs font-medium text-amber-600">
                  #{rank}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(staff.totalRevenue)} total revenue
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {staff.completedAppointments}
              </p>
              <p className="text-xs text-muted-foreground">Sessions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {formatCurrency(Math.round(avgPerSession))}
              </p>
              <p className="text-xs text-muted-foreground">Avg/Session</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <div>
              <p className="text-sm font-medium">
                {staff.averageRating.toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground">Rating</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{staff.cancelRate}%</p>
              <p className="text-xs text-muted-foreground">Cancel Rate</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
