import type { EvaluationResult } from '../../core/types'

interface ModelSummaryProps {
  results: EvaluationResult[]
  shortestPath: number
  selectedId: string | undefined
  onSelect: (result: EvaluationResult) => void
}

export default function ModelSummary({
  results,
  shortestPath,
  selectedId,
  onSelect,
}: ModelSummaryProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="font-semibold mb-3">Model Results</h3>
      <div className="space-y-2">
        {results.map((result) => {
          const isSelected = result.id === selectedId
          const outcomeColor =
            result.outcome === 'success'
              ? 'text-green-400'
              : result.outcome === 'parse_error'
                ? 'text-yellow-400'
                : 'text-red-400'

          return (
            <button
              type="button"
              key={result.id}
              onClick={() => onSelect(result)}
              className={`w-full text-left p-3 rounded transition-colors ${
                isSelected
                  ? 'bg-blue-600 border border-blue-500'
                  : 'bg-gray-700 hover:bg-gray-600 border border-transparent'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="truncate flex-1">
                  <span className="font-mono text-sm">{result.model}</span>
                </div>
                <span className={`text-sm font-medium ${outcomeColor}`}>{result.outcome}</span>
              </div>
              <div className="flex gap-4 mt-2 text-xs text-gray-400">
                <span>
                  Steps: {result.solutionLength ?? '-'}/{shortestPath}
                </span>
                {result.efficiency !== null && (
                  <span>Efficiency: {(result.efficiency * 100).toFixed(0)}%</span>
                )}
                <span>{result.inferenceTimeMs}ms</span>
                {result.costUsd !== null && <span>${result.costUsd.toFixed(4)}</span>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
