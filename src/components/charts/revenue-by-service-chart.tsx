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
import { getRevenueByService } from "@/lib/mock-data"
import { REVENUE_COLOR } from "@/lib/chart-colors"
import { formatCurrency } from "@/lib/utils"

const data = getRevenueByService()

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
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  )
}

export function RevenueByServiceChart() {
  return (
    <ChartWrapper title="Revenue by Service Type">
      <ResponsiveContainer width="100%" height={Math.max(300, data.length * 50)}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) =>
              `$${(value / 100).toLocaleString()}`
            }
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={120}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="revenue"
            fill={REVENUE_COLOR}
            radius={[0, 4, 4, 0]}
            barSize={24}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}
