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
import { REVENUE_COLOR, EXPENSE_COLOR } from "@/lib/chart-colors"
import { formatCurrency, formatCurrencyAxis } from "@/lib/utils"
import { formatMonth } from "@/lib/time"


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
      <p className="mb-1 text-sm font-medium">{label ? formatMonth(label, "long") : ""}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  )
}

export function PnLChart({
  data,
}: {
  data: { month: string; revenue: number; expenses: number; partial: boolean }[]
}) {
  return (
    <ChartWrapper
      title="Profit & Loss"
      description="Revenue and expenses by month. The current month is to date."
      isEmpty={data.every((d) => d.revenue === 0 && d.expenses === 0)}
      emptyTitle="No financial data yet"
      emptyDescription="Record payments and expenses to see profit and loss by month."
    >
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="month"
            interval={0}
            tickFormatter={(month: string) =>
              `${formatMonth(month, "short")}${data.find((d) => d.month === month)?.partial ? " MTD" : ""}`
            }
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
          <Legend />
          <Bar
            dataKey="revenue"
            name="Revenue"
            fill={REVENUE_COLOR}
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="expenses"
            name="Expenses"
            fill={EXPENSE_COLOR}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}
