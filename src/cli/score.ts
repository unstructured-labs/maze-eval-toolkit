/**
 * CLI command for computing LMIQ scores from evaluation results
 */

import { existsSync, readdirSync } from 'node:fs'
import { ExitPromptError } from '@inquirer/core'
import { confirm, input, select } from '@inquirer/prompts'
import chalk from 'chalk'
import { Command } from 'commander'
import type { Difficulty, EvaluationResult } from '../core/types'
import { DIFFICULTIES } from '../core/types'
import { closeDatabase, initDatabase } from '../db/client'

/**
 * Human reference values for scoring
 */
const HUMAN_REFERENCE: Record<Difficulty, { timeSeconds: number; accuracy: number }> = {
  simple: { timeSeconds: 10, accuracy: 0.95 },
  easy: { timeSeconds: 20, accuracy: 0.95 },
  medium: { timeSeconds: 30, accuracy: 0.92 },
  hard: { timeSeconds: 60, accuracy: 0.9 },
  nightmare: { timeSeconds: 90, accuracy: 0.85 },
}

const HUMAN_BRAIN_WATTS = 20
const LLM_GPU_WATTS = 350

interface ScoreOptions {
  databasePath: string
  model?: string
  testSetId?: string
}

interface DifficultyScores {
  total: number
  successes: number
  accuracy: number
  avgPathEfficiency: number
  avgTimeEfficiency: number
  avgLmiq: number
  avgInferenceTimeMs: number
  totalCost: number
}

interface OverallScores {
  total: number
  successes: number
  accuracy: number
  adjustedAccuracy: number
  avgTimeEfficiency: number
  avgLmiq: number
  energyEfficiency: number
  totalInferenceTimeMs: number
  totalCost: number
  byDifficulty: Record<Difficulty, DifficultyScores>
}

/**
 * Get all evaluations from the database
 */
function getAllEvaluations(dbPath: string): EvaluationResult[] {
  const db = initDatabase(dbPath)
  const query = db.query('SELECT * FROM evaluations')
  const rows = query.all() as any[]
  closeDatabase()

  return rows.map((row) => ({
    id: row.id,
    runId: row.run_id,
    testSetId: row.test_set_id,
    mazeId: row.maze_id,
    model: row.model,
    difficulty: row.difficulty,
    prompt: row.prompt,
    promptFormats: JSON.parse(row.prompt_formats),
    startedAt: row.started_at,
    completedAt: row.completed_at,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    reasoningTokens: row.reasoning_tokens,
    costUsd: row.cost_usd,
    inferenceTimeMs: row.inference_time_ms,
    rawResponse: row.raw_response,
    parsedMoves: row.parsed_moves ? JSON.parse(row.parsed_moves) : null,
    reasoning: row.reasoning,
    outcome: row.outcome,
    movesExecuted: row.moves_executed,
    finalPosition: row.final_position ? JSON.parse(row.final_position) : null,
    solutionLength: row.solution_length,
    shortestPath: row.shortest_path,
    efficiency: row.efficiency,
  }))
}

/**
 * Get unique models in the database
 */
function getUniqueModels(evaluations: EvaluationResult[]): string[] {
  return [...new Set(evaluations.map((e) => e.model))]
}

/**
 * Get unique test set IDs in the database
 */
function getUniqueTestSets(evaluations: EvaluationResult[]): string[] {
  return [...new Set(evaluations.map((e) => e.testSetId))]
}

/**
 * Compute scores for a set of evaluations
 */
function computeScores(evaluations: EvaluationResult[]): OverallScores {
  const byDifficulty: Record<Difficulty, DifficultyScores> = {} as any

  // Initialize per-difficulty scores
  for (const difficulty of DIFFICULTIES) {
    const diffEvals = evaluations.filter((e) => e.difficulty === difficulty)
    if (diffEvals.length === 0) {
      byDifficulty[difficulty] = {
        total: 0,
        successes: 0,
        accuracy: 0,
        avgPathEfficiency: 0,
        avgTimeEfficiency: 0,
        avgLmiq: 0,
        avgInferenceTimeMs: 0,
        totalCost: 0,
      }
      continue
    }

    const successes = diffEvals.filter((e) => e.outcome === 'success')
    const humanTimeMs = HUMAN_REFERENCE[difficulty].timeSeconds * 1000

    // Path efficiency for successes
    const pathEfficiencies = successes
      .map((e) => e.efficiency)
      .filter((e): e is number => e !== null)
    const avgPathEfficiency =
      pathEfficiencies.length > 0
        ? pathEfficiencies.reduce((a, b) => a + b, 0) / pathEfficiencies.length
        : 0

    // Time efficiency per task (capped at 1.0, 0 if failed)
    const timeEfficiencies = diffEvals.map((e) => {
      if (e.outcome !== 'success') return 0
      return Math.min(humanTimeMs / e.inferenceTimeMs, 1.0)
    })
    const avgTimeEfficiency = timeEfficiencies.reduce((a, b) => a + b, 0) / timeEfficiencies.length

    // LMIQ score per task: time_efficiency × path_efficiency (0 if failed)
    const lmiqScores = diffEvals.map((e) => {
      if (e.outcome !== 'success') return 0
      const timeEff = Math.min(humanTimeMs / e.inferenceTimeMs, 1.0)
      const pathEff = e.efficiency !== null ? e.efficiency : 0
      return timeEff * pathEff
    })
    const avgLmiq = lmiqScores.reduce((a, b) => a + b, 0) / lmiqScores.length

    // Inference time and cost
    const totalInferenceTimeMs = diffEvals.reduce((a, e) => a + e.inferenceTimeMs, 0)
    const totalCost = diffEvals.reduce((a, e) => a + (e.costUsd ?? 0), 0)

    byDifficulty[difficulty] = {
      total: diffEvals.length,
      successes: successes.length,
      accuracy: successes.length / diffEvals.length,
      avgPathEfficiency,
      avgTimeEfficiency,
      avgLmiq,
      avgInferenceTimeMs: totalInferenceTimeMs / diffEvals.length,
      totalCost,
    }
  }

  // Overall scores
  const total = evaluations.length
  const successes = evaluations.filter((e) => e.outcome === 'success')
  const accuracy = total > 0 ? successes.length / total : 0

  // Adjusted accuracy = accuracy × avg path efficiency for successes
  const allPathEfficiencies = successes
    .map((e) => e.efficiency)
    .filter((e): e is number => e !== null)
  const avgSuccessPathEfficiency =
    allPathEfficiencies.length > 0
      ? allPathEfficiencies.reduce((a, b) => a + b, 0) / allPathEfficiencies.length
      : 0
  const adjustedAccuracy = accuracy * avgSuccessPathEfficiency

  // Overall time efficiency (0 if failed, capped at 1.0 if success)
  let totalTimeEfficiency = 0
  let timeEfficiencyCount = 0
  for (const e of evaluations) {
    if (e.outcome === 'success') {
      const humanTimeMs = HUMAN_REFERENCE[e.difficulty].timeSeconds * 1000
      totalTimeEfficiency += Math.min(humanTimeMs / e.inferenceTimeMs, 1.0)
    }
    // Failed tasks contribute 0 to time efficiency
    timeEfficiencyCount++
  }
  const avgTimeEfficiency = timeEfficiencyCount > 0 ? totalTimeEfficiency / timeEfficiencyCount : 0

  // Overall LMIQ score
  let totalLmiq = 0
  for (const e of evaluations) {
    const humanTimeMs = HUMAN_REFERENCE[e.difficulty].timeSeconds * 1000
    const timeEff = Math.min(humanTimeMs / e.inferenceTimeMs, 1.0)
    const pathEff = e.outcome === 'success' && e.efficiency !== null ? e.efficiency : 0
    totalLmiq += timeEff * pathEff
  }
  const avgLmiq = total > 0 ? totalLmiq / total : 0

  // Energy efficiency
  // Human: sum of (human_time_seconds × 20 watts) per difficulty
  // LLM: sum of (inference_time_seconds × 350 watts)
  let humanJoules = 0
  let llmJoules = 0
  for (const e of evaluations) {
    const humanTimeSeconds = HUMAN_REFERENCE[e.difficulty].timeSeconds
    humanJoules += humanTimeSeconds * HUMAN_BRAIN_WATTS
    llmJoules += (e.inferenceTimeMs / 1000) * LLM_GPU_WATTS
  }
  const energyEfficiency = llmJoules > 0 ? humanJoules / llmJoules : 0

  // Total inference time and cost
  const totalInferenceTimeMs = evaluations.reduce((a, e) => a + e.inferenceTimeMs, 0)
  const totalCost = evaluations.reduce((a, e) => a + (e.costUsd ?? 0), 0)

  return {
    total,
    successes: successes.length,
    accuracy,
    adjustedAccuracy,
    avgTimeEfficiency,
    avgLmiq,
    energyEfficiency,
    totalInferenceTimeMs,
    totalCost,
    byDifficulty,
  }
}

/**
 * Compute human reference LMIQ score (for comparison)
 */
function computeHumanLmiq(): number {
  // Human has ~95% accuracy on average, 100% path efficiency (optimal), 100% time efficiency
  // LMIQ = time_efficiency × path_efficiency × accuracy adjustment
  let totalLmiq = 0
  let count = 0
  for (const difficulty of DIFFICULTIES) {
    const humanAcc = HUMAN_REFERENCE[difficulty].accuracy
    // Human LMIQ = 1.0 (time) × 1.0 (path) × accuracy
    totalLmiq += humanAcc
    count++
  }
  return totalLmiq / count
}

/**
 * Format percentage
 */
function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

/**
 * Print score card
 */
function printScoreCard(modelName: string, scores: OverallScores): void {
  const humanLmiq = computeHumanLmiq()
  const avgHumanAccuracy =
    DIFFICULTIES.reduce((a, d) => a + HUMAN_REFERENCE[d].accuracy, 0) / DIFFICULTIES.length

  console.log()
  console.log(chalk.bold(`LMIQ Score Card - ${modelName}`))
  console.log(chalk.dim('─'.repeat(55)))
  console.log()

  // Header
  console.log(chalk.dim('                      Model        Human Ref'))
  console.log(chalk.dim('                      ─────        ─────────'))

  // Overall Accuracy
  const accColor = scores.accuracy >= avgHumanAccuracy ? chalk.green : chalk.yellow
  console.log(
    `Overall Accuracy      ${accColor(pct(scores.accuracy).padEnd(12))} ${pct(avgHumanAccuracy)}`,
  )

  // Adjusted Accuracy
  console.log(
    `Adjusted Accuracy     ${chalk.cyan(pct(scores.adjustedAccuracy).padEnd(12))} ${pct(avgHumanAccuracy)}`,
  )

  // Time Efficiency
  const timeColor = scores.avgTimeEfficiency >= 0.5 ? chalk.green : chalk.yellow
  console.log(`Time Efficiency       ${timeColor(pct(scores.avgTimeEfficiency).padEnd(12))} 100.0%`)

  // LMIQ Score
  const lmiqColor = scores.avgLmiq >= humanLmiq * 0.8 ? chalk.green : chalk.yellow
  console.log(
    `LMIQ Score            ${lmiqColor(pct(scores.avgLmiq).padEnd(12))} ${pct(humanLmiq)}`,
  )

  // Energy Efficiency
  const energyStr = scores.energyEfficiency.toFixed(2)
  const energyColor = scores.energyEfficiency >= 1.0 ? chalk.green : chalk.yellow
  console.log(`Energy Efficiency     ${energyColor(energyStr.padEnd(12))} 1.00`)

  console.log()
  console.log(chalk.bold('By Difficulty:'))
  console.log(chalk.dim('               Accuracy   Efficiency   LMIQ'))

  for (const difficulty of DIFFICULTIES) {
    const ds = scores.byDifficulty[difficulty]
    if (ds.total === 0) continue

    const humanRef = HUMAN_REFERENCE[difficulty]
    const accStr = pct(ds.accuracy)
    const effStr = pct(ds.avgTimeEfficiency)
    const lmiqStr = pct(ds.avgLmiq)

    const accColor = ds.accuracy >= humanRef.accuracy ? chalk.green : chalk.red
    const effColor = ds.avgTimeEfficiency >= 0.5 ? chalk.green : chalk.red
    const lmiqColor = ds.avgLmiq >= humanRef.accuracy * 0.8 ? chalk.green : chalk.red

    console.log(
      `  ${difficulty.padEnd(12)} ${accColor(accStr.padEnd(10))} ${effColor(effStr.padEnd(12))} ${lmiqColor(lmiqStr)}`,
    )
  }

  console.log()
  console.log(chalk.dim('─'.repeat(55)))
  console.log(
    `Total Evaluations: ${scores.total} | Cost: $${scores.totalCost.toFixed(4)} | Time: ${(scores.totalInferenceTimeMs / 1000).toFixed(1)}s`,
  )
  console.log()
}

function findDatabases(): string[] {
  const resultsDir = './results'
  if (!existsSync(resultsDir)) return []
  return readdirSync(resultsDir)
    .filter((f) => f.endsWith('.db'))
    .map((f) => `${resultsDir}/${f}`)
}

async function promptForOptions(): Promise<ScoreOptions> {
  console.log(chalk.bold('\nLMIQ Score Calculator'))
  console.log(chalk.dim('─'.repeat(50)))
  console.log()

  // Find available databases
  const databases = findDatabases()
  let databasePath: string

  if (databases.length > 0) {
    const choices = [
      ...databases.map((d) => ({ name: d, value: d })),
      { name: 'Other (enter path)', value: '__custom__' },
    ]
    const selected = await select({
      message: 'Select evaluation database:',
      choices,
      pageSize: choices.length,
    })
    if (selected === '__custom__') {
      databasePath = await input({
        message: 'Database path:',
        validate: (value) => (existsSync(value) ? true : 'File not found'),
      })
    } else {
      databasePath = selected
    }
  } else {
    databasePath = await input({
      message: 'Database path:',
      default: './results/eval.db',
      validate: (value) => (existsSync(value) ? true : 'File not found'),
    })
  }

  // Load evaluations to get available models
  const evaluations = getAllEvaluations(databasePath)
  const models = getUniqueModels(evaluations)
  const testSets = getUniqueTestSets(evaluations)

  let model: string | undefined
  if (models.length > 1) {
    const modelChoices = [
      { name: 'All models', value: '__all__' },
      ...models.map((m) => ({ name: m, value: m })),
    ]
    const selectedModel = await select({
      message: 'Select model to score:',
      choices: modelChoices,
      pageSize: modelChoices.length,
    })
    model = selectedModel === '__all__' ? undefined : selectedModel
  } else if (models.length === 1) {
    model = models[0]
    console.log(chalk.dim(`Using model: ${model}`))
  }

  let testSetId: string | undefined
  if (testSets.length > 1) {
    const testSetChoices = [
      { name: 'All test sets', value: '__all__' },
      ...testSets.map((t) => ({ name: `${t.slice(0, 8)}...`, value: t })),
    ]
    const selectedTestSet = await select({
      message: 'Select test set:',
      choices: testSetChoices,
      pageSize: testSetChoices.length,
    })
    testSetId = selectedTestSet === '__all__' ? undefined : selectedTestSet
  }

  console.log()
  const confirmed = await confirm({
    message: 'Calculate scores?',
    default: true,
  })

  if (!confirmed) {
    console.log(chalk.yellow('Cancelled'))
    process.exit(0)
  }

  return { databasePath, model, testSetId }
}

async function runScoring(options: ScoreOptions): Promise<void> {
  const { databasePath, model, testSetId } = options

  // Load all evaluations
  let evaluations = getAllEvaluations(databasePath)

  // Filter by model if specified
  if (model) {
    evaluations = evaluations.filter((e) => e.model === model)
  }

  // Filter by test set if specified
  if (testSetId) {
    evaluations = evaluations.filter((e) => e.testSetId === testSetId)
  }

  if (evaluations.length === 0) {
    console.log(chalk.red('No evaluations found matching criteria'))
    return
  }

  // Group by model and compute scores
  const models = getUniqueModels(evaluations)

  for (const m of models) {
    const modelEvals = evaluations.filter((e) => e.model === m)
    const scores = computeScores(modelEvals)
    printScoreCard(m, scores)
  }
}

export const scoreCommand = new Command('score')
  .description('Compute LMIQ scores from evaluation results')
  .option('-d, --database <path>', 'Evaluation database path')
  .option('-m, --model <model>', 'Filter by model')
  .option('-t, --test-set <id>', 'Filter by test set ID')
  .option('-i, --interactive', 'Run in interactive mode (default if no options provided)')
  .action(async (options) => {
    // Determine if we should run interactive mode
    const hasOptions = options.database
    const interactive = options.interactive || !hasOptions

    if (interactive) {
      try {
        const scoreOptions = await promptForOptions()
        await runScoring(scoreOptions)
      } catch (err) {
        if (err instanceof ExitPromptError) {
          console.log(chalk.yellow('\nCancelled'))
          process.exit(0)
        }
        throw err
      }
      return
    }

    // Non-interactive mode
    const databasePath = options.database as string
    const model = options.model as string | undefined
    const testSetId = options.testSet as string | undefined

    if (!existsSync(databasePath)) {
      console.error(chalk.red(`Database not found: ${databasePath}`))
      process.exit(1)
    }

    await runScoring({ databasePath, model, testSetId })
  })
