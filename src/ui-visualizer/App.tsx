import type { EvaluationResult } from '@/core/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AccuracyChart } from './components/charts/AccuracyChart'
import { EnergyEfficiencyChart } from './components/charts/EnergyEfficiencyChart'
import { LMIQChart } from './components/charts/LMIQChart'
import { TimeEfficiencyChart } from './components/charts/TimeEfficiencyChart'
import {
  ELITE_HUMAN_REFERENCE,
  HUMAN_REFERENCE,
  aggregateByModelAndFormat,
  computeHumanBaseline,
  findBestModel,
  getShortModelName,
} from './lib/scoreUtils'

// Models to exclude from visualization
const EXCLUDED_MODELS = ['kimi-k2-thinking', 'claude-3.5-sonnet', 'gpt-4o', 'claude-haiku-4.5']

export default function App() {
  const [results, setResults] = useState<EvaluationResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [useElite, setUseElite] = useState(false)
  const [accuracyWeight, setAccuracyWeight] = useState(1)

  // Load results file
  const loadResults = useCallback(async (filename: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/results/${filename}`)
      if (!response.ok) throw new Error('Failed to fetch')
      const data = (await response.json()) as EvaluationResult[]
      // Filter out excluded models
      const filtered = data.filter((r) => !EXCLUDED_MODELS.includes(getShortModelName(r.model)))
      setResults(filtered)
    } catch (err) {
      setError(`Failed to load results: ${err}`)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-load results.json on mount
  useEffect(() => {
    fetch('/api/results')
      .then((r) => r.json())
      .then((d: { files: string[] }) => {
        if (d.files.includes('results.json')) {
          loadResults('results.json')
        } else if (d.files.length > 0 && d.files[0]) {
          loadResults(d.files[0])
        } else {
          setLoading(false)
          setError('No results files found')
        }
      })
      .catch(() => {
        setLoading(false)
        setError('Failed to fetch results list')
      })
  }, [loadResults])

  // Compute model+format scores (for metric charts)
  const modelFormatScores = useMemo(() => {
    if (results.length === 0) return []
    return aggregateByModelAndFormat(results, useElite, accuracyWeight)
  }, [results, useElite, accuracyWeight])

  // Compute human baseline (for charts - based on toggle)
  const humanBaseline = useMemo(() => {
    return computeHumanBaseline(results, useElite, accuracyWeight)
  }, [results, useElite, accuracyWeight])

  // Compute both human baselines for reference card
  const humanBaselineAvg = useMemo(() => {
    return computeHumanBaseline(results, false, accuracyWeight)
  }, [results, accuracyWeight])

  const humanBaselineElite = useMemo(() => {
    return computeHumanBaseline(results, true, accuracyWeight)
  }, [results, accuracyWeight])

  // Compute weighted average times based on difficulty distribution
  const humanTimes = useMemo(() => {
    if (results.length === 0) return { avg: 0, elite: 0 }
    const difficultyCount: Record<string, number> = {}
    for (const r of results) {
      difficultyCount[r.difficulty] = (difficultyCount[r.difficulty] || 0) + 1
    }
    const total = results.length
    let avgTime = 0
    let eliteTime = 0
    for (const [diff, count] of Object.entries(difficultyCount)) {
      const weight = count / total
      avgTime += weight * HUMAN_REFERENCE[diff as keyof typeof HUMAN_REFERENCE].timeSeconds
      eliteTime +=
        weight * ELITE_HUMAN_REFERENCE[diff as keyof typeof ELITE_HUMAN_REFERENCE].timeSeconds
    }
    return { avg: avgTime, elite: eliteTime }
  }, [results])

  // Find best models for summary stats
  const bestAccuracy = useMemo(
    () => findBestModel(modelFormatScores, 'accuracy'),
    [modelFormatScores],
  )
  const bestLmiq = useMemo(() => findBestModel(modelFormatScores, 'lmiq'), [modelFormatScores])

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">LMIQ Score Visualizer</h1>
          <div className="flex items-center gap-6">
            {/* Accuracy Weight Slider */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">LMIQ Accuracy Weight:</span>
              <input
                type="range"
                min="1"
                max="3"
                step="0.5"
                value={accuracyWeight}
                onChange={(e) => setAccuracyWeight(Number(e.target.value))}
                className="w-24 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="text-sm font-mono w-8">{accuracyWeight}x</span>
            </div>
            {/* Human Toggle */}
            <div className="flex items-center gap-3">
              <span
                className={`text-sm ${!useElite ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                Avg Human
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={useElite}
                onClick={() => setUseElite(!useElite)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  useElite ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    useElite ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm ${useElite ? 'text-foreground' : 'text-muted-foreground'}`}>
                Elite Human
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {loading && (
          <div className="text-center py-20">
            <p className="text-muted-foreground">Loading results...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {!loading && !error && results.length > 0 && (
          <div className="space-y-8">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-card rounded-lg p-4 border border-border">
                <div className="text-muted-foreground text-sm">Total Evaluations</div>
                <div className="text-2xl font-bold">{results.length}</div>
              </div>
              <div className="bg-card rounded-lg p-4 border border-border">
                <div className="text-muted-foreground text-sm">Human Baseline Reference</div>
                <div className="text-sm mt-2 space-y-1">
                  <div>
                    <span className="text-blue-400">Average Human:</span>{' '}
                    <span className="text-muted-foreground">
                      {(humanBaselineAvg.accuracy * 100).toFixed(0)}% accuracy,{' '}
                      {humanTimes.avg.toFixed(0)}s/problem
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-400">Elite Human:</span>{' '}
                    <span className="text-muted-foreground">
                      {(humanBaselineElite.accuracy * 100).toFixed(0)}% accuracy,{' '}
                      {humanTimes.elite.toFixed(0)}s/problem
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-lg p-4 border border-border">
                <div className="text-muted-foreground text-sm">Best Accuracy</div>
                <div className="text-2xl font-bold text-green-500">
                  {bestAccuracy ? `${(bestAccuracy.value * 100).toFixed(1)}%` : '-'}
                </div>
                {bestAccuracy && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {bestAccuracy.shortModel} ({bestAccuracy.format})
                  </div>
                )}
              </div>
              <div className="bg-card rounded-lg p-4 border border-border">
                <div className="text-muted-foreground text-sm">Best LMIQ</div>
                <div className="text-2xl font-bold text-primary">
                  {bestLmiq ? (bestLmiq.value * 100).toFixed(1) : '-'}
                </div>
                {bestLmiq && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {bestLmiq.shortModel} ({bestLmiq.format})
                  </div>
                )}
              </div>
            </div>

            {/* Charts Row 1: Accuracy & LMIQ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card rounded-lg p-4 border border-border">
                <h2 className="text-lg font-semibold mb-1">Accuracy</h2>
                <p className="text-xs text-muted-foreground mb-4">
                  Percentage of mazes solved correctly. Human baseline accuracy varies by difficulty
                  (93-100% for average, 96-100% for elite).
                </p>
                <AccuracyChart data={modelFormatScores} humanBaseline={humanBaseline} />
              </div>
              <div className="bg-card rounded-lg p-4 border border-border">
                <h2 className="text-lg font-semibold mb-1">LMIQ Score</h2>
                <p className="text-xs text-muted-foreground mb-4">
                  Composite score = Time Efficiency × Path Efficiency × Accuracy
                  {accuracyWeight !== 1 ? <sup>{accuracyWeight}</sup> : null}. Measures overall
                  problem-solving capability relative to human performance.
                </p>
                <LMIQChart data={modelFormatScores} humanBaseline={humanBaseline} />
              </div>
            </div>

            {/* Charts Row 2: Time Efficiency & Energy Efficiency */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card rounded-lg p-4 border border-border">
                <h2 className="text-lg font-semibold mb-1">
                  Model Time Efficiency vs. Human Performance
                </h2>
                <p className="text-xs text-muted-foreground mb-4">
                  Multiplier = LLM inference time ÷ human solving time. Human baseline uses
                  difficulty-adjusted times (10-90s). Values &gt;1x indicate slower than human.
                </p>
                <TimeEfficiencyChart data={modelFormatScores} humanBaseline={humanBaseline} />
              </div>
              <div className="bg-card rounded-lg p-4 border border-border">
                <h2 className="text-lg font-semibold mb-1">
                  Model Energy Efficiency vs. Human Performance
                </h2>
                <p className="text-xs text-muted-foreground mb-4">
                  Multiplier = LLM energy ÷ human energy. Assumes human brain at 20W, LLM inference
                  at 350W (single GPU). Values &gt;1x indicate less efficient than human.
                </p>
                <EnergyEfficiencyChart data={modelFormatScores} humanBaseline={humanBaseline} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
