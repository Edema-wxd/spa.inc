"use client"

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  type PieLabelRenderProps,
} from "recharts"
import { ChartWrapper } from "@/components/shared/chart-wrapper"
import { getRevenueByMethod } from "@/lib/mock-data"
import { CHART_COLORS } from "@/lib/chart-colors"
import { formatCurrency } from "@/lib/utils"

const data = getRevenueByMethod()
const total = data.reduce((sum, d) => sum + d.revenue, 0)

const METHOD_LABELS: Record<string, string> = {
  CARD: "Card",
  CASH: "Cash",
  TRANSFER: "Transfer",
  OTHER: "Other",
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: { method: string; revenue: number } }>
}) {
  if (!active || !payload || payload.length === 0) return null

  const { method, revenue } = payload[0].payload
  const pct = ((revenue / total) * 100).toFixed(1)
  return (
    <div className="rounded-lg border bg-card p-3 shadow-md">
      <p className="mb-1 text-sm font-medium">
        {METHOD_LABELS[method] || method}
      </p>
      <p className="text-sm text-muted-foreground">
        {formatCurrency(revenue)} ({pct}%)
      </p>
    </div>
  )
}

const RADIAN = Math.PI / 180

function renderCustomizedLabel(props: PieLabelRenderProps) {
  const cx = Number(props.cx) || 0
  const cy = Number(props.cy) || 0
  const midAngle = Number(props.midAngle) || 0
  const outerRadius = Number(props.outerRadius) || 0
  const percent = Number(props.percent) || 0
  const method = String((props as unknown as Record<string, unknown>).method ?? props.name ?? "")

  const radius = outerRadius + 25
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text
      x={x}
      y={y}
      fill="#374151"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={12}
    >
      {METHOD_LABELS[method] || method} ({(percent * 100).toFixed(0)}%)
    </text>
  )
}

export function RevenueByMethodChart() {
  return (
    <ChartWrapper
      title="Revenue by Payment Method"
      isEmpty={total === 0}
      emptyTitle="No payments yet"
      emptyDescription="See how clients pay once you record payments."
      emptyAction={{ label: "Record Payment", href: "/dashboard/payments/new" }}
    >
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            dataKey="revenue"
            nameKey="method"
            label={renderCustomizedLabel}
            labelLine={true}
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value: string) => METHOD_LABELS[value] || value}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}
