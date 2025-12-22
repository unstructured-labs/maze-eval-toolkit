import type { PromptFormat } from '@/core/types'
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
import type { HumanBaseline, ModelWithFormats } from '../../lib/scoreUtils'
import { FORMAT_COLORS, FORMAT_ORDER } from '../../lib/scoreUtils'

interface TimeEfficiencyChartProps {
  data: ModelWithFormats[]
  humanBaseline: HumanBaseline
}

type ChartRow = {
  name: string
  fullName: string
  human?: number
} & Partial<Record<PromptFormat, number>>

export function TimeEfficiencyChart({ data }: TimeEfficiencyChartProps) {
  // Get unique formats present in data, sorted by fixed order
  const formatsInData = new Set(data.flatMap((m) => m.formats.map((f) => f.format)))
  const formats = FORMAT_ORDER.filter((f) => formatsInData.has(f))

  // Build grouped chart data: one row per model with format values as properties
  // Show time multiplier vs human (1/timeEfficiency = llmTime/humanTime)
  // Higher values = takes more time than human
  const chartData: ChartRow[] = [
    {
      name: 'Human (1x)',
      fullName: 'Average Human',
      human: 1, // Human is the baseline at 1x
    },
  ]

  for (const model of data) {
    const row: ChartRow = {
      name: model.shortModel,
      fullName: model.model,
    }
    for (const fmt of model.formats) {
      // Invert: timeEfficiency = humanTime/llmTime (capped at 1), so 1/timeEfficiency = llmTime/humanTime
      row[fmt.format] = fmt.avgTimeEfficiency > 0 ? 1 / fmt.avgTimeEfficiency : 0
    }
    chartData.push(row)
  }

  // Custom legend items
  const legendPayload = [
    { value: 'Human', color: '#3b82f6' },
    ...formats.map((f) => ({
      value: f,
      color: FORMAT_COLORS[f] || '#6b7280',
    })),
  ]

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart
        data={chartData}
        barCategoryGap="8%"
        margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis
          dataKey="name"
          tick={{ fill: '#a3a3a3', fontSize: 11 }}
          angle={-45}
          textAnchor="end"
          height={60}
          interval={0}
        />
        <YAxis
          tick={{ fill: '#a3a3a3', fontSize: 10 }}
          scale="log"
          domain={[0.5, 'auto']}
          allowDataOverflow
          tickFormatter={(v) => `${v}x`}
          label={{
            value: 'Multiplier (Log Scale)',
            angle: -90,
            position: 'insideLeft',
            fill: '#a3a3a3',
            fontSize: 11,
          }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '6px',
          }}
          labelStyle={{ color: '#fff' }}
          itemStyle={{ color: '#a3a3a3' }}
          cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
          formatter={(value, name) => [`${Number(value).toFixed(1)}x human time`, name]}
          labelFormatter={(_, payload) => {
            const item = payload?.[0]?.payload as ChartRow | undefined
            return item?.fullName || ''
          }}
        />
        <Legend
          verticalAlign="top"
          height={64}
          content={() => (
            <div className="flex flex-wrap justify-center gap-x-4 text-xs text-gray-400">
              {legendPayload.map((item) => (
                <div key={item.value} className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                  <span>{item.value}</span>
                </div>
              ))}
            </div>
          )}
        />
        <Bar
          dataKey="human"
          fill="#3b82f6"
          fillOpacity={0.7}
          stroke="#3b82f6"
          strokeWidth={1}
          radius={[1, 1, 0, 0]}
          name="Human"
        />
        {formats.map((format) => (
          <Bar
            key={format}
            dataKey={format}
            fill={FORMAT_COLORS[format] || '#6b7280'}
            fillOpacity={0.7}
            stroke={FORMAT_COLORS[format] || '#6b7280'}
            strokeWidth={1}
            radius={[1, 1, 0, 0]}
            name={format}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
