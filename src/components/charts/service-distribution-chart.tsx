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
import { getRevenueByService } from "@/lib/mock-data"
import { CHART_COLORS } from "@/lib/chart-colors"
import { formatCurrency } from "@/lib/utils"

const data = getRevenueByService()

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: { name: string; revenue: number } }>
}) {
  if (!active || !payload || payload.length === 0) return null

  const { name, revenue } = payload[0].payload
  return (
    <div className="rounded-lg border bg-card p-3 shadow-md">
      <p className="mb-1 text-sm font-medium">{name}</p>
      <p className="text-sm text-muted-foreground">
        {formatCurrency(revenue)}
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
  const name = String(props.name ?? "")

  const radius = outerRadius + 30
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  if (percent < 0.05) return null

  return (
    <text
      x={x}
      y={y}
      fill="#374151"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={12}
    >
      {name} ({(percent * 100).toFixed(0)}%)
    </text>
  )
}

export function ServiceDistributionChart() {
  return (
    <ChartWrapper title="Revenue by Service">
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={100}
            dataKey="revenue"
            nameKey="name"
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
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}
