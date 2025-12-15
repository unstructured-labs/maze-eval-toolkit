/**
 * CLI command for exporting evaluation results to JSON
 */

import { existsSync, readdirSync, writeFileSync } from 'node:fs'
import { ExitPromptError } from '@inquirer/core'
import { input, select } from '@inquirer/prompts'
import chalk from 'chalk'
import { Command } from 'commander'
import type { EvaluationResult } from '../core/types'
import { closeDatabase, initDatabase } from '../db/client'

function findDatabases(): string[] {
  const resultsDir = './results'
  if (!existsSync(resultsDir)) return []
  return readdirSync(resultsDir)
    .filter((f) => f.endsWith('.db'))
    .map((f) => `${resultsDir}/${f}`)
}

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
