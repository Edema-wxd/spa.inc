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
import { PROFIT_COLOR } from "@/lib/chart-colors"
import { formatDateKey } from "@/lib/time"
import { formatCurrency, formatCurrencyAxis } from "@/lib/utils"

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
      <p className="mb-1 text-sm font-medium">
        Through {label ? formatDateKey(label, { weekday: "short", month: "short", day: "numeric" }) : ""}
      </p>
      <p
        className="text-sm font-medium"
        style={{ color: isPositive ? "#27AE60" : "#E74C3C" }}
      >
        Running profit: {formatCurrency(value)}
      </p>
    </div>
  )
}

export function DailyPnLChart({ data }: { data: { date: string; profit: number }[] }) {
  const minProfit = Math.min(...data.map((d) => d.profit))
  const hasNegative = minProfit < 0

  return (
    <ChartWrapper
      title="Running Profit"
      description="Cumulative profit over the last 30 days. Rent and payroll days show as steps down."
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
            minTickGap={24}
            tickFormatter={(key: string) => formatDateKey(key, { month: "short", day: "numeric" })}
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
