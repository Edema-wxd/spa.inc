"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { ChartWrapper } from "@/components/shared/chart-wrapper"
import { REVENUE_COLOR, EXPENSE_COLOR } from "@/lib/chart-colors"
import { formatDateKey } from "@/lib/time"
import { formatCurrency, formatCurrencyAxis } from "@/lib/utils"

interface Point {
  date: string
  revenue: number
  expenses: number | null
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; name: string; color: string }>
  label?: string
}) {
  if (!active || !payload || payload.length === 0 || !label) return null

  return (
    <div className="rounded-lg border bg-card p-3 shadow-md">
      <p className="mb-1 text-sm font-medium">
        Through {formatDateKey(label, { weekday: "short", month: "short", day: "numeric" })}
      </p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  )
}

/** Running revenue (and expense) totals; the gap between the lines is profit. */
export function RevenueExpensesChart({ data }: { data: Point[] }) {
  const withExpenses = data.some((d) => d.expenses !== null)
  const last = data[data.length - 1]

  return (
    <ChartWrapper
      title={withExpenses ? "Revenue vs Expenses" : "Revenue"}
      description={
        withExpenses && last
          ? `Running totals, last 30 days. Net so far: ${formatCurrency(last.revenue - (last.expenses ?? 0))}`
          : "Running total, last 30 days"
      }
      isEmpty={data.every((d) => d.revenue === 0 && !d.expenses)}
      emptyTitle="No activity in the last 30 days"
      emptyDescription="Revenue and expenses you record will be charted here."
      emptyAction={{ label: "Record Payment", href: "/dashboard/payments/new" }}
    >
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
            tickFormatter={(key: string) => formatDateKey(key, { month: "short", day: "numeric" })}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={formatCurrencyAxis}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke={REVENUE_COLOR}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          {withExpenses && (
            <Line
              type="stepAfter"
              dataKey="expenses"
              name="Expenses"
              stroke={EXPENSE_COLOR}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}
