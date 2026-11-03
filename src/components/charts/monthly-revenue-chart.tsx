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
import { REVENUE_COLOR } from "@/lib/chart-colors"
import { formatCurrency, formatCurrencyAxis } from "@/lib/utils"
import { formatMonth } from "@/lib/time"

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
      <p className="mb-1 text-sm font-medium">{label ? formatMonth(label, "long") : ""}</p>
      <p className="text-sm" style={{ color: REVENUE_COLOR }}>
        Revenue: {formatCurrency(payload[0].value)}
      </p>
    </div>
  )
}

export function MonthlyRevenueChart({ data }: { data: { month: string; revenue: number }[] }) {
  return (
    <ChartWrapper
      title="Monthly Revenue Trend"
      description="Last 12 months, current month to date"
      isEmpty={data.every((d) => d.revenue === 0)}
      emptyTitle="No revenue yet"
      emptyDescription="Monthly revenue appears here once payments are recorded."
      emptyAction={{ label: "Record Payment", href: "/dashboard/payments/new" }}
    >
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="month"
            interval={0}
            tickFormatter={(month: string) => formatMonth(month, "short")}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatCurrencyAxis}
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
