import { useMemo, useState } from 'react'
import type { ModelScore } from '../lib/scoreUtils'
import { formatCost, formatPercent, formatTime } from '../lib/scoreUtils'

interface ScoresTableProps {
  data: ModelScore[]
}

type SortKey = 'model' | 'totalEvals' | 'accuracy' | 'avgLmiq' | 'avgInferenceTimeMs' | 'totalCost'
type SortDirection = 'asc' | 'desc'

export function ScoresTable({ data }: ScoresTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('accuracy')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      let aVal: number | string
      let bVal: number | string

      switch (sortKey) {
        case 'model':
          aVal = a.model.toLowerCase()
          bVal = b.model.toLowerCase()
          break
        case 'totalEvals':
          aVal = a.totalEvals
          bVal = b.totalEvals
          break
        case 'accuracy':
          aVal = a.accuracy
          bVal = b.accuracy
          break
        case 'avgLmiq':
          aVal = a.avgLmiq
          bVal = b.avgLmiq
          break
        case 'avgInferenceTimeMs':
          aVal = a.avgInferenceTimeMs
          bVal = b.avgInferenceTimeMs
          break
        case 'totalCost':
          aVal = a.totalCost
          bVal = b.totalCost
          break
        default:
          return 0
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }

      const modifier = sortDirection === 'asc' ? 1 : -1
      return ((aVal as number) - (bVal as number)) * modifier
    })
  }, [data, sortKey, sortDirection])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDirection('desc')
    }
  }

  const SortHeader = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => (
    <th className="px-4 py-3 text-left">
      <button
        type="button"
        className="flex items-center gap-1 hover:text-primary transition-colors"
        onClick={() => handleSort(sortKeyName)}
      >
        {label}
        {sortKey === sortKeyName && (
          <span className="text-primary">{sortDirection === 'asc' ? '↑' : '↓'}</span>
        )}
      </button>
    </th>
  )

  const getAccuracyColor = (accuracy: number): string => {
    if (accuracy >= 0.8) return 'text-green-500'
    if (accuracy >= 0.5) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getLmiqColor = (lmiq: number): string => {
    if (lmiq >= 0.5) return 'text-green-500'
    if (lmiq >= 0.25) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <SortHeader label="Model" sortKeyName="model" />
            <SortHeader label="Evals" sortKeyName="totalEvals" />
            <SortHeader label="Accuracy" sortKeyName="accuracy" />
            <SortHeader label="LMIQ" sortKeyName="avgLmiq" />
            <SortHeader label="Avg Time" sortKeyName="avgInferenceTimeMs" />
            <SortHeader label="Total Cost" sortKeyName="totalCost" />
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row) => (
            <tr key={row.model} className="border-t border-border hover:bg-muted/30">
              <td className="px-4 py-3">
                <div>
                  <div className="font-medium">{row.shortModel}</div>
                  <div className="text-muted-foreground text-xs">{row.model}</div>
                </div>
              </td>
              <td className="px-4 py-3">{row.totalEvals}</td>
              <td className={`px-4 py-3 font-medium ${getAccuracyColor(row.accuracy)}`}>
                {formatPercent(row.accuracy)}
              </td>
              <td className={`px-4 py-3 font-medium ${getLmiqColor(row.avgLmiq)}`}>
                {(row.avgLmiq * 100).toFixed(1)}
              </td>
              <td className="px-4 py-3">{formatTime(row.avgInferenceTimeMs)}</td>
              <td className="px-4 py-3">{formatCost(row.totalCost)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
