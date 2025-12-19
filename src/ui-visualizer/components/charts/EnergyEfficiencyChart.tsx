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

interface EnergyEfficiencyChartProps {
  data: ModelWithFormats[]
  humanBaseline: HumanBaseline
}

type ChartRow = {
  name: string
  fullName: string
  human?: number
} & Partial<Record<PromptFormat, number>>

export function EnergyEfficiencyChart({ data }: EnergyEfficiencyChartProps) {
  // Get unique formats present in data, sorted by fixed order
  const formatsInData = new Set(data.flatMap((m) => m.formats.map((f) => f.format)))
  const formats = FORMAT_ORDER.filter((f) => formatsInData.has(f))

  // Build grouped chart data: one row per model with format values as properties
  // Show energy multiplier vs human (1/energyEfficiency = llmEnergy/humanEnergy)
  // Higher values = uses more energy than human
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
      // Invert: energyEfficiency = humanEnergy/llmEnergy, so 1/energyEfficiency = llmEnergy/humanEnergy
      row[fmt.format] = fmt.energyEfficiency > 0 ? 1 / fmt.energyEfficiency : 0
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
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis
          dataKey="name"
          tick={{ fill: '#a3a3a3', fontSize: 11 }}
          angle={-45}
          textAnchor="end"
          height={80}
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
          formatter={(value, name) => [`${Number(value).toFixed(1)}x human energy`, name]}
          labelFormatter={(_, payload) => {
            const item = payload?.[0]?.payload as ChartRow | undefined
            return item?.fullName || ''
          }}
        />
        <Legend
          verticalAlign="top"
          height={36}
          content={() => (
            <div className="flex justify-center gap-4 text-xs text-gray-400">
              {legendPayload.map((item) => (
                <div key={item.value} className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                  <span>{item.value}</span>
                </div>
              ))}
            </div>
          )}
        />
        {/* Render bars with human in the middle for centering */}
        {formats.slice(0, Math.ceil(formats.length / 2)).map((format) => (
          <Bar
            key={format}
            dataKey={format}
            fill={FORMAT_COLORS[format] || '#6b7280'}
            radius={[4, 4, 0, 0]}
            name={format}
          />
        ))}
        <Bar dataKey="human" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Human" />
        {formats.slice(Math.ceil(formats.length / 2)).map((format) => (
          <Bar
            key={format}
            dataKey={format}
            fill={FORMAT_COLORS[format] || '#6b7280'}
            radius={[4, 4, 0, 0]}
            name={format}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
