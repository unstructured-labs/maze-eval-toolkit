import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ModelScore } from '../../lib/scoreUtils'
import { OUTCOME_COLORS } from '../../lib/scoreUtils'

interface OutcomeChartProps {
  data: ModelScore[]
}

export function OutcomeChart({ data }: OutcomeChartProps) {
  // Get all unique outcomes across all models
  const allOutcomes = new Set<string>()
  for (const d of data) {
    for (const outcome of Object.keys(d.outcomes)) {
      allOutcomes.add(outcome)
    }
  }
  const outcomes = [...allOutcomes].sort()

  // Transform data for stacked bar chart (as percentages)
  const chartData = data.map((d) => {
    const total = d.totalEvals
    const row: Record<string, string | number> = {
      name: d.shortModel,
      fullName: d.model,
    }
    for (const outcome of outcomes) {
      row[outcome] = total > 0 ? ((d.outcomes[outcome] || 0) / total) * 100 : 0
    }
    return row
  })

  return (
    <ResponsiveContainer width="100%" height={450}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis
          dataKey="name"
          tick={{ fill: '#a3a3a3', fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis tick={{ fill: '#a3a3a3' }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '6px',
          }}
          labelStyle={{ color: '#fff' }}
          itemStyle={{ color: '#a3a3a3' }}
          cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
          formatter={(value, name) => [`${Number(value).toFixed(1)}%`, name]}
          labelFormatter={(label, payload) => {
            const item = payload?.[0]?.payload
            return item?.fullName || label
          }}
        />
        <Legend verticalAlign="top" height={36} wrapperStyle={{ color: '#a3a3a3' }} />
        {outcomes.map((outcome) => (
          <Bar
            key={outcome}
            dataKey={outcome}
            stackId="outcomes"
            fill={OUTCOME_COLORS[outcome] || '#6b7280'}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
