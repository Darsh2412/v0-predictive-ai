"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"

interface DashboardSummary {
  total_machines?: number
  healthy_machines?: number
  warning_machines?: number
  critical_machines?: number
  avg_health_score?: number
  recent_anomalies?: number
  total_batches?: number
  avg_efficiency?: number
  total_defects?: number
  last_updated?: string
}

interface HealthDistributionChartProps {
  dashboardSummary: DashboardSummary
}

export function HealthDistributionChart({ dashboardSummary }: HealthDistributionChartProps) {
  const data = [
    { name: "Healthy", value: dashboardSummary.healthy_machines || 0, color: "#10B981" },
    { name: "Warning", value: dashboardSummary.warning_machines || 0, color: "#F59E0B" },
    { name: "Critical", value: dashboardSummary.critical_machines || 0, color: "#EF4444" },
  ]

  const COLORS = ["#10B981", "#F59E0B", "#EF4444"]

  const RADIAN = Math.PI / 180
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize="12">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomizedLabel}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => [`${value} machines`, ""]} />
        <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: "12px" }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
