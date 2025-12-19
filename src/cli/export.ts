/**
 * CLI command for exporting evaluation results to JSON
 */

import { existsSync, readdirSync, writeFileSync } from 'node:fs'
import { ExitPromptError } from '@inquirer/core'
import { input, select } from '@inquirer/prompts'
import chalk from 'chalk'
import { Command } from 'commander'
import type { Difficulty, EvaluationOutcome, PromptFormat } from '../core/types'
import { closeDatabase, initDatabase } from '../db/client'

/**
 * Minimal evaluation data required for the visualizer
 * Excludes large fields like prompt, rawResponse, parsedMoves, reasoning
 */
interface VisualizerEvaluation {
  model: string
  difficulty: Difficulty
  promptFormats: PromptFormat[]
  outcome: EvaluationOutcome
  efficiency: number | null
  inferenceTimeMs: number
  costUsd: number | null
}

function findDatabases(): string[] {
  const resultsDir = './results'
  if (!existsSync(resultsDir)) return []
  return readdirSync(resultsDir)
    .filter((f) => f.endsWith('.db'))
    .map((f) => `${resultsDir}/${f}`)
}

function getAllEvaluations(dbPath: string): VisualizerEvaluation[] {
  const db = initDatabase(dbPath)
  const query = db.query(
    'SELECT model, difficulty, prompt_formats, outcome, efficiency, inference_time_ms, cost_usd FROM evaluations',
  )
  const rows = query.all() as any[]
  closeDatabase()

  return rows.map((row) => ({
    model: row.model,
    difficulty: row.difficulty,
    promptFormats: JSON.parse(row.prompt_formats),
    outcome: row.outcome,
    efficiency: row.efficiency,
    inferenceTimeMs: row.inference_time_ms,
    costUsd: row.cost_usd,
  }))
}

async function run() {
  console.log(chalk.bold('\nLMIQ Results Export'))
  console.log(chalk.dim('─'.repeat(50)))
  console.log()

  // Find available databases
  const databases = findDatabases()
  if (databases.length === 0) {
    console.error(chalk.red('No databases found in ./results/'))
    console.error('Run `task evaluate` to create one')
    process.exit(1)
  }

  const databasePath = await select({
    message: 'Select evaluation database:',
    choices: databases.map((d) => ({ name: d, value: d })),
    pageSize: databases.length,
  })

  // Output path
  const outputPath = await input({
    message: 'Output JSON path:',
    default: './results/results.json',
  })

  // Load and export
  console.log()
  console.log('Exporting results...')

  const results = getAllEvaluations(databasePath)
  writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8')

  console.log()
  console.log(chalk.dim('─'.repeat(50)))
  console.log(chalk.bold('Export Complete'))
  console.log(`  Records: ${results.length}`)
  console.log(`  Output: ${chalk.cyan(outputPath)}`)
  console.log()
}

export const exportCommand = new Command('export')
  .description('Export evaluation results to JSON for the UI')
  .action(async () => {
    try {
      await run()
    } catch (err) {
      if (err instanceof ExitPromptError) {
        console.log(chalk.yellow('\nCancelled'))
        process.exit(0)
      }
      throw err
    }
  })
