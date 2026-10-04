"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getStaffLeaderboard } from "@/lib/mock-data"
import { formatCurrency } from "@/lib/utils"
import { Star, Trophy } from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"
import { cn } from "@/lib/utils"

const leaderboard = getStaffLeaderboard()

const rankStyles: Record<number, string> = {
  1: "bg-amber-100 text-amber-800 border-amber-300",
  2: "bg-gray-100 text-gray-700 border-gray-300",
  3: "bg-orange-100 text-orange-800 border-orange-300",
}

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    return (
      <span
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold",
          rankStyles[rank]
        )}
      >
        {rank}
      </span>
    )
  }
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center text-sm text-muted-foreground">
      {rank}
    </span>
  )
}

function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating)
  const hasHalf = rating - fullStars >= 0.5

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i < fullStars
              ? "fill-amber-400 text-amber-400"
              : i === fullStars && hasHalf
                ? "fill-amber-400/50 text-amber-400"
                : "text-gray-300"
          )}
        />
      ))}
      <span className="ml-1 text-sm text-muted-foreground">
        {rating.toFixed(1)}
      </span>
    </div>
  )
}

export function LeaderboardTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          Staff Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        {leaderboard.length === 0 ? (
          <EmptyState
            compact
            icon={<Trophy className="h-10 w-10" />}
            title="No rankings yet"
            description="Add active therapists and record sessions to see who leads the board."
            action={{ label: "Go to Staff", href: "/dashboard/staff" }}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Total Revenue</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
                <TableHead className="text-right">Avg/Session</TableHead>
                <TableHead>Satisfaction</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.map((staff, index) => {
                const avgPerSession =
                  staff.completedAppointments > 0
                    ? staff.totalRevenue / staff.completedAppointments
                    : 0

                return (
                  <TableRow
                    key={staff.staffId}
                    className={cn(
                      index < 3 && "bg-muted/30"
                    )}
                  >
                    <TableCell>
                      <RankBadge rank={index + 1} />
                    </TableCell>
                    <TableCell className="font-medium">{staff.name}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(staff.totalRevenue)}
                    </TableCell>
                    <TableCell className="text-right">
                      {staff.completedAppointments}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Math.round(avgPerSession))}
                    </TableCell>
                    <TableCell>
                      <StarRating rating={staff.averageRating} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
