"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { ChartWrapper } from "@/components/shared/chart-wrapper"
import { getRevenueVsExpenses } from "@/lib/mock-data"
import { PROFIT_COLOR } from "@/lib/chart-colors"
import { formatCurrency } from "@/lib/utils"

function computeDailyPnL() {
  const dailyData = getRevenueVsExpenses(30)
  let cumulative = 0

  return dailyData.map((day) => {
    const dailyProfit = day.revenue - day.expenses
    cumulative += dailyProfit
    return {
      date: day.date,
      profit: cumulative,
    }
  })
}

const data = computeDailyPnL()

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

  const value = payload[0].value
  const isPositive = value >= 0

  return (
    <div className="rounded-lg border bg-card p-3 shadow-md">
      <p className="mb-1 text-sm font-medium">{label}</p>
      <p
        className="text-sm font-medium"
        style={{ color: isPositive ? "#27AE60" : "#E74C3C" }}
      >
        Cumulative P&L: {formatCurrency(value)}
      </p>
    </div>
  )
}

export function DailyPnLChart() {
  const minProfit = Math.min(...data.map((d) => d.profit))
  const hasNegative = minProfit < 0

  return (
    <ChartWrapper
      title="Daily Profit Trend"
      description="Cumulative P&L over the last 30 days"
      isEmpty={data.every((d) => d.profit === 0)}
      emptyTitle="No profit data yet"
      emptyDescription="Record payments and expenses to see your daily profit trend."
    >
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={PROFIT_COLOR} stopOpacity={0.3} />
              <stop offset="95%" stopColor={PROFIT_COLOR} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
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
          {hasNegative && (
            <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />
          )}
          <Area
            type="monotone"
            dataKey="profit"
            stroke={PROFIT_COLOR}
            strokeWidth={2}
            fill="url(#profitGradient)"
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}
