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
import { REVENUE_COLOR } from "@/lib/chart-colors"
import { formatDateKey } from "@/lib/time"
import { formatCurrency, formatCurrencyAxis } from "@/lib/utils"

export function StaffRevenueChart({ data }: { data: { week: string; revenue: number }[] }) {

  return (
    <ChartWrapper
      title="Revenue Trend"
      description="Weekly revenue over the last 12 weeks"
      isEmpty={data.every((d) => d.revenue === 0)}
      emptyTitle="No revenue yet"
      emptyDescription="Payments recorded for this therapist will be charted here."
    >
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="week"
            tickFormatter={(key: string) => formatDateKey(key, { month: "short", day: "numeric" })}
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
            tickFormatter={formatCurrencyAxis}
            width={56}
          />
          <Tooltip
            formatter={(value) => [formatCurrency(value as number), "Revenue"]}
            labelFormatter={(key) => `Week of ${formatDateKey(String(key), { month: "short", day: "numeric" })}`}
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
