"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { ChartWrapper } from "@/components/shared/chart-wrapper"
import { payments } from "@/lib/mock-data"
import { REVENUE_COLOR } from "@/lib/chart-colors"
import { formatCurrency } from "@/lib/utils"
import {
  startOfWeek,
  endOfWeek,
  subWeeks,
  isWithinInterval,
  parseISO,
  format,
} from "date-fns"

interface StaffRevenueChartProps {
  staffId: string
}

function getWeeklyRevenue(staffId: string) {
  const today = new Date()
  const data: { week: string; revenue: number }[] = []

  for (let i = 11; i >= 0; i--) {
    const weekDate = subWeeks(today, i)
    const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 })

    const weekRevenue = payments
      .filter(
        (p) =>
          p.staff_id === staffId &&
          p.status === "COMPLETED" &&
          isWithinInterval(parseISO(p.payment_date), {
            start: weekStart,
            end: weekEnd,
          })
      )
      .reduce((sum, p) => sum + p.amount, 0)

    data.push({
      week: format(weekStart, "MMM d"),
      revenue: weekRevenue,
    })
  }

  // If all zeros, generate fallback data
  const hasData = data.some((d) => d.revenue > 0)
  if (!hasData) {
    return data.map((d, i) => ({
      ...d,
      revenue: 25000 + ((i * 17 + 3) % 10) * 8000,
    }))
  }

  return data
}

export function StaffRevenueChart({ staffId }: StaffRevenueChartProps) {
  const data = getWeeklyRevenue(staffId)

  return (
    <ChartWrapper title="Revenue Trend" description="Weekly revenue over the last 12 weeks">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
            tickFormatter={(value) => formatCurrency(value)}
          />
          <Tooltip
            formatter={(value) => [formatCurrency(value as number), "Revenue"]}
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid hsl(var(--border))",
              backgroundColor: "hsl(var(--popover))",
              color: "hsl(var(--popover-foreground))",
            }}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke={REVENUE_COLOR}
            strokeWidth={2}
            dot={{ fill: REVENUE_COLOR, r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}
