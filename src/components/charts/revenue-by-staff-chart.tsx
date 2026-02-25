"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { ChartWrapper } from "@/components/shared/chart-wrapper"
import { getRevenueByStaff } from "@/lib/mock-data"
import { CHART_COLORS } from "@/lib/chart-colors"
import { formatCurrency } from "@/lib/utils"

const data = getRevenueByStaff()

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
      <p className="text-sm text-muted-foreground">
        Revenue: {formatCurrency(payload[0].value)}
      </p>
    </div>
  )
}

export function RevenueByStaffChart() {
  return (
    <ChartWrapper title="Revenue by Staff">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="name"
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
          <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}
