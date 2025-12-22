import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/ui-library/components/ui'
import { useEffect, useMemo, useState } from 'react'
import { getEffectivePromptFormat } from '../../core/prompt-format'
import type { EvaluationResult } from '../../core/types'

function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds}s`
  return `${minutes}m ${seconds}s`
}

const MODEL_ORDER = ['gemini', 'gpt', 'claude', 'grok', 'human']

function getModelSortIndex(model: string): number {
  const lowerModel = model.toLowerCase()
  for (let i = 0; i < MODEL_ORDER.length; i++) {
    if (lowerModel.includes(MODEL_ORDER[i]!)) {
      return i
    }
  }
  return MODEL_ORDER.length
}

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
  const grouped = useMemo(() => {
    const map = new Map<string, EvaluationResult[]>()
    for (const result of results) {
      const existing = map.get(result.model) ?? []
      existing.push(result)
      map.set(result.model, existing)
    }

    const entries = Array.from(map.entries()).sort(
      ([modelA], [modelB]) => getModelSortIndex(modelA) - getModelSortIndex(modelB),
    )

    return entries.map(([model, modelResults]) => {
      const sorted = [...modelResults].sort((a, b) => {
        const aTrial = a.trialNumber ?? 0
        const bTrial = b.trialNumber ?? 0
        return aTrial - bTrial
      })
      const successes = modelResults.filter((r) => r.outcome === 'success').length
      const total = modelResults.length
      const successRate = total > 0 ? (successes / total) * 100 : 0
      return { model, results: sorted, total, successRate }
    })
  }, [results])

  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!selectedId) return
    const match = results.find((r) => r.id === selectedId)
    if (!match) return
    setExpandedModels((prev) => {
      if (prev.has(match.model)) return prev
      const next = new Set(prev)
      next.add(match.model)
      return next
    })
  }, [results, selectedId])

  const toggleModel = (model: string) => {
    setExpandedModels((prev) => {
      const next = new Set(prev)
      if (next.has(model)) {
        next.delete(model)
      } else {
        next.add(model)
      }
      return next
    })
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Model Results</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {grouped.map(({ model, results: modelResults, total, successRate }) => {
          const isExpanded = expandedModels.has(model)
          return (
            <div key={model} className="space-y-1">
              <button
                type="button"
                onClick={() => toggleModel(model)}
                className="w-full text-left px-2 py-2 rounded border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs truncate">
                    {model} ({total} trials, {successRate.toFixed(0)}% success rate)
                  </span>
                  <span className="text-xs text-muted-foreground">{isExpanded ? '▾' : '▸'}</span>
                </div>
              </button>

              {isExpanded && (
                <div className="space-y-1">
                  {modelResults.map((result) => {
                    const isSelected = result.id === selectedId
                    const isSuccess = result.outcome === 'success'
                    const trialLabel =
                      result.totalTrials && result.totalTrials > 1
                        ? `Trial ${result.trialNumber ?? 1}/${result.totalTrials}`
                        : 'Trial'
                    const format = getEffectivePromptFormat(result.promptFormats) ?? 'unknown'

                    return (
                      <button
                        type="button"
                        key={result.id}
                        onClick={() => onSelect(result)}
                        className={`w-full text-left px-2 py-1.5 rounded transition-colors ${
                          isSelected
                            ? 'bg-primary/20 border border-primary'
                            : 'hover:bg-accent border border-transparent'
                        }`}
                      >
                        <div className="flex justify-between items-center gap-2">
                          <span className="font-mono text-xs truncate flex-1">{trialLabel}</span>
                          <Badge
                            variant="outline"
                            className={`text-xs px-1.5 py-0 ${
                              isSuccess
                                ? 'border-green-400/50 text-green-400 bg-green-400/10'
                                : 'border-red-400/50 text-red-400 bg-red-400/10'
                            }`}
                          >
                            {result.outcome}
                          </Badge>
                        </div>
                        <div className="flex gap-3 text-[10px] text-muted-foreground mt-0.5">
                          <span>
                            {result.solutionLength ?? '-'}/{shortestPath} steps
                          </span>
                          <span className="uppercase font-mono text-primary">{format}</span>
                          {result.efficiency !== null && (
                            <span>{(result.efficiency * 100).toFixed(0)}% efficiency</span>
                          )}
                          <span>{formatTime(result.inferenceTimeMs)}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
