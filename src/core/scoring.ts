/**
 * Centralized scoring utilities for LMIQ calculations
 *
 * These functions are the single source of truth for computing:
 * - Time efficiency
 * - Path efficiency
 * - LMIQ score
 * - Energy efficiency
 *
 * Used by both CLI (score.ts) and UI visualizer (scoreUtils.ts)
 */

import { HUMAN_BRAIN_WATTS, LLM_GPU_WATTS, getEffectiveBaseline } from './difficulty'
import type { Difficulty, TestSetHumanBaselines } from './types'

/**
 * Result of a single evaluation (minimal fields needed for scoring)
 */
export interface ScoringEvaluation {
  difficulty: Difficulty
  outcome: string
  inferenceTimeMs: number
  efficiency: number | null
  costUsd?: number | null
}

/**
 * Computed scores for a set of evaluations
 */
export interface ComputedScores {
  total: number
  successes: number
  accuracy: number
  avgPathEfficiency: number
  avgTimeEfficiency: number
  avgTimeEfficiencyElite: number
  avgLmiq: number
  avgLmiqElite: number
  energyEfficiency: number
  energyEfficiencyElite: number
  totalInferenceTimeMs: number
  totalCost: number
}

/**
 * Compute time efficiency for a single evaluation
 *
 * Time efficiency = min(humanTime / inferenceTime, 1.0)
 * Returns 0 for failed evaluations
 */
export function computeTimeEfficiency(
  eval_: ScoringEvaluation,
  customBaselines: TestSetHumanBaselines | undefined,
  elite: boolean,
): number {
  if (eval_.outcome !== 'success') return 0
  const baseline = getEffectiveBaseline(eval_.difficulty, customBaselines, elite)
  const humanTimeMs = baseline.timeSeconds * 1000
  return Math.min(humanTimeMs / eval_.inferenceTimeMs, 1.0)
}

/**
 * Compute LMIQ score for a single evaluation
 *
 * LMIQ = timeEfficiency × pathEfficiency
 * Returns 0 for failed evaluations
 */
export function computeLmiq(
  eval_: ScoringEvaluation,
  customBaselines: TestSetHumanBaselines | undefined,
  elite: boolean,
): number {
  if (eval_.outcome !== 'success') return 0
  const timeEff = computeTimeEfficiency(eval_, customBaselines, elite)
  // Cap path efficiency at 1.0 (can exceed 1.0 for legacy data from mazes with special instructions)
  const pathEff = eval_.efficiency !== null ? Math.min(eval_.efficiency, 1.0) : 0
  return timeEff * pathEff
}

/**
 * Compute energy (joules) for human to complete an evaluation
 */
export function computeHumanEnergy(
  eval_: ScoringEvaluation,
  customBaselines: TestSetHumanBaselines | undefined,
  elite: boolean,
): number {
  const baseline = getEffectiveBaseline(eval_.difficulty, customBaselines, elite)
  return baseline.timeSeconds * HUMAN_BRAIN_WATTS
}

/**
 * Compute energy (joules) for LLM to complete an evaluation
 */
export function computeLlmEnergy(eval_: ScoringEvaluation): number {
  return (eval_.inferenceTimeMs / 1000) * LLM_GPU_WATTS
}

/**
 * Compute all scores for a set of evaluations
 *
 * This is the canonical implementation used by both CLI and visualizer.
 * All scores follow the principle: failures contribute 0, divide by total.
 */
export function computeScores(
  evaluations: ScoringEvaluation[],
  customBaselines?: TestSetHumanBaselines,
): ComputedScores {
  const total = evaluations.length
  const successes = evaluations.filter((e) => e.outcome === 'success')

  if (total === 0) {
    return {
      total: 0,
      successes: 0,
      accuracy: 0,
      avgPathEfficiency: 0,
      avgTimeEfficiency: 0,
      avgTimeEfficiencyElite: 0,
      avgLmiq: 0,
      avgLmiqElite: 0,
      energyEfficiency: 0,
      energyEfficiencyElite: 0,
      totalInferenceTimeMs: 0,
      totalCost: 0,
    }
  }

  // Accuracy
  const accuracy = successes.length / total

  // Path efficiency (average over successes only - this IS correct since it's
  // measuring quality of successful solutions, not penalizing failures twice)
  // Cap each value at 1.0 (can exceed 1.0 for legacy data from mazes with special instructions)
  const pathEfficiencies = successes
    .map((e) => e.efficiency)
    .filter((e): e is number => e !== null)
    .map((e) => Math.min(e, 1.0))
  const avgPathEfficiency =
    pathEfficiencies.length > 0
      ? pathEfficiencies.reduce((a, b) => a + b, 0) / pathEfficiencies.length
      : 0

  // Time efficiency and LMIQ (failures contribute 0, divide by total)
  let totalTimeEfficiency = 0
  let totalTimeEfficiencyElite = 0
  let totalLmiq = 0
  let totalLmiqElite = 0
  let totalHumanEnergy = 0
  let totalHumanEnergyElite = 0
  let totalLlmEnergy = 0
  let totalInferenceTimeMs = 0
  let totalCost = 0

  for (const e of evaluations) {
    // Time efficiency
    totalTimeEfficiency += computeTimeEfficiency(e, customBaselines, false)
    totalTimeEfficiencyElite += computeTimeEfficiency(e, customBaselines, true)

    // LMIQ
    totalLmiq += computeLmiq(e, customBaselines, false)
    totalLmiqElite += computeLmiq(e, customBaselines, true)

    // Energy
    totalHumanEnergy += computeHumanEnergy(e, customBaselines, false)
    totalHumanEnergyElite += computeHumanEnergy(e, customBaselines, true)
    totalLlmEnergy += computeLlmEnergy(e)

    // Totals
    totalInferenceTimeMs += e.inferenceTimeMs
    totalCost += e.costUsd ?? 0
  }

  // Average over total (failures contribute 0)
  const avgTimeEfficiency = totalTimeEfficiency / total
  const avgTimeEfficiencyElite = totalTimeEfficiencyElite / total
  const avgLmiq = totalLmiq / total
  const avgLmiqElite = totalLmiqElite / total

  // Energy efficiency = human energy / LLM energy
  const energyEfficiency = totalLlmEnergy > 0 ? totalHumanEnergy / totalLlmEnergy : 0
  const energyEfficiencyElite = totalLlmEnergy > 0 ? totalHumanEnergyElite / totalLlmEnergy : 0

  return {
    total,
    successes: successes.length,
    accuracy,
    avgPathEfficiency,
    avgTimeEfficiency,
    avgTimeEfficiencyElite,
    avgLmiq,
    avgLmiqElite,
    energyEfficiency,
    energyEfficiencyElite,
    totalInferenceTimeMs,
    totalCost,
  }
}

/**
 * Compute scores grouped by difficulty
 */
export function computeScoresByDifficulty(
  evaluations: ScoringEvaluation[],
  customBaselines?: TestSetHumanBaselines,
): Record<Difficulty, ComputedScores> {
  const difficulties: Difficulty[] = ['simple', 'easy', 'medium', 'hard', 'nightmare', 'horror']
  const result: Record<Difficulty, ComputedScores> = {} as any

  for (const difficulty of difficulties) {
    const diffEvals = evaluations.filter((e) => e.difficulty === difficulty)
    result[difficulty] = computeScores(diffEvals, customBaselines)
  }

  return result
}
