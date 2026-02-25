"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { ChartWrapper } from "@/components/shared/chart-wrapper"
import { getMonthlyRevenueTrend } from "@/lib/mock-data"
import { REVENUE_COLOR } from "@/lib/chart-colors"
import { formatCurrency } from "@/lib/utils"

const data = getMonthlyRevenueTrend(12)

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="rounded-lg border bg-card p-3 shadow-md">
      <p className="mb-1 text-sm font-medium">{label}</p>
      <p className="text-sm" style={{ color: REVENUE_COLOR }}>
        Revenue: {formatCurrency(payload[0].value)}
      </p>
    </div>
  )
}

export function MonthlyRevenueChart() {
  return (
    <ChartWrapper title="Monthly Revenue Trend">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) =>
              `$${(value / 100).toLocaleString()}`
            }
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="revenue"
            fill={REVENUE_COLOR}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}
