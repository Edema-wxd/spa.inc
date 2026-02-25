"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { ChartWrapper } from "@/components/shared/chart-wrapper"
import { getStaffLeaderboard } from "@/lib/mock-data"
import { REVENUE_COLOR } from "@/lib/chart-colors"
import { formatCurrency } from "@/lib/utils"

const leaderboard = getStaffLeaderboard()

const data = leaderboard.map((staff) => ({
  name: staff.name,
  revenue: staff.totalRevenue,
  sessions: staff.completedAppointments,
}))

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; name: string; color: string }>
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="rounded-lg border bg-card p-3 shadow-md">
      <p className="mb-1 text-sm font-medium">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
          {entry.name}:{" "}
          {entry.name === "Revenue"
            ? formatCurrency(entry.value)
            : entry.value}
        </p>
      ))}
    </div>
  )
}

export function PerformanceComparisonChart() {
  return (
    <ChartWrapper title="Staff Performance Comparison">
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="revenue"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) =>
              `$${(value / 100).toLocaleString()}`
            }
          />
          <YAxis
            yAxisId="sessions"
            orientation="right"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar
            yAxisId="revenue"
            dataKey="revenue"
            name="Revenue"
            fill={REVENUE_COLOR}
            radius={[4, 4, 0, 0]}
          />
          <Bar
            yAxisId="sessions"
            dataKey="sessions"
            name="Sessions"
            fill="#48C9B0"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}
