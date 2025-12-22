/**
 * CLI command for rescoring evaluations against current test set constraints
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { ExitPromptError } from '@inquirer/core'
import { confirm, select } from '@inquirer/prompts'
import chalk from 'chalk'
import { Command } from 'commander'
import { validateSolutionWithConstraints } from '../core/maze-solver'
import type { EvaluationOutcome, MoveAction, TestSetFile } from '../core/types'
import { closeDatabase, initDatabase } from '../db/client'
import { DB_DIR, findDatabases } from './utils'

interface RescoreOptions {
  databasePath: string
  testSetId: string
  filePath?: string
  includeHuman: boolean
  dryRun: boolean
}

interface TestSetInfo {
  id: string
  name: string
}

type MazeEntry = TestSetFile['mazes'][keyof TestSetFile['mazes']][number]

function getTestSets(dbPath: string): TestSetInfo[] {
  const db = initDatabase(dbPath)
  const query = db.query(
    'SELECT DISTINCT test_set_id, test_set_name FROM evaluations ORDER BY test_set_id',
  )
  const rows = query.all() as { test_set_id: string; test_set_name: string }[]
  closeDatabase()

  return rows.map((row) => ({
    id: row.test_set_id,
    name: row.test_set_name || row.test_set_id,
  }))
}

function loadTestSetById(testSetId: string, filePath?: string): TestSetFile | null {
  if (filePath) {
    const content = readFileSync(filePath, 'utf-8')
    return JSON.parse(content) as TestSetFile
  }

  const testSetsDir = './test-sets'
  if (!existsSync(testSetsDir)) return null

  const files = readdirSync(testSetsDir).filter((f) => f.endsWith('.json'))
  for (const file of files) {
    try {
      const content = readFileSync(`${testSetsDir}/${file}`, 'utf-8')
      const testSet = JSON.parse(content) as TestSetFile
      if (testSet.id === testSetId) {
        return testSet
      }
    } catch {
      // Ignore invalid files
    }
  }

  return null
}

function buildMazeMap(testSet: TestSetFile): Map<string, MazeEntry> {
  const map = new Map<string, MazeEntry>()
  for (const mazes of Object.values(testSet.mazes) as MazeEntry[][]) {
    for (const maze of mazes) {
      map.set(maze.id, maze)
    }
  }
  return map
}

async function promptForOptions(): Promise<RescoreOptions> {
  const databases = findDatabases()
  if (databases.length === 0) {
    console.error(chalk.red(`No databases found in ${DB_DIR}/`))
    process.exit(1)
  }

  let databasePath: string
  if (databases.length === 1) {
    databasePath = databases[0]!
    console.log(chalk.dim(`Using database: ${databasePath}`))
  } else {
    databasePath = await select({
      message: 'Select evaluation database:',
      choices: databases.map((d) => ({ name: d, value: d })),
      pageSize: databases.length,
    })
  }

  const testSets = getTestSets(databasePath)
  if (testSets.length === 0) {
    console.error(chalk.red('No test sets found in database'))
    process.exit(1)
  }

  const testSetId = await select({
    message: 'Select test set to rescore:',
    choices: testSets.map((t) => ({ name: t.name, value: t.id })),
    pageSize: testSets.length,
  })

  const includeHuman = await confirm({
    message: 'Include human evaluations?',
    default: false,
  })

  const dryRun = await confirm({
    message: 'Dry run only (no DB updates)?',
    default: true,
  })

  return { databasePath, testSetId, includeHuman, dryRun }
}

function computeOutcome(
  maze: MazeEntry,
  moves: MoveAction[],
): {
  outcome: EvaluationOutcome
  movesExecuted: number | null
  finalPosition: string | null
  solutionLength: number | null
  efficiency: number | null
  shortestPath: number
} {
  if (moves.length === 0) {
    return {
      outcome: 'no_path_found',
      movesExecuted: null,
      finalPosition: null,
      solutionLength: null,
      efficiency: null,
      shortestPath: maze.shortestPath,
    }
  }

  const validation = validateSolutionWithConstraints(
    maze.grid,
    maze.start,
    maze.goal,
    maze.shortestPath,
    moves,
    maze.requirementType
      ? {
          requirementType: maze.requirementType,
          requiredSolutionSubsequences: maze.requiredSolutionSubsequences,
          requiredTiles: maze.requiredTiles,
        }
      : undefined,
  )

  let outcome: EvaluationOutcome
  if (!validation.isValid) {
    outcome = 'invalid_move'
  } else if (validation.reachesGoal) {
    outcome = validation.constraintsSatisfied === false ? 'constraint_violated' : 'success'
  } else {
    outcome = 'failure'
  }

  return {
    outcome,
    movesExecuted: validation.pathLength,
    finalPosition: JSON.stringify(validation.finalPosition),
    solutionLength: validation.pathLength,
    efficiency: validation.efficiency,
    shortestPath: maze.shortestPath,
  }
}

export const rescoreCommand = new Command('rescore')
  .description('Rescore evaluations using current test set constraints')
  .option('-d, --db <path>', 'Path to database file')
  .option('-t, --test-set <id>', 'Test set ID to rescore')
  .option('-f, --file <path>', 'Path to test set JSON file')
  .option('--include-human', 'Include human evaluations', false)
  .option('--apply', 'Apply updates to the database', false)
  .action(async (options: Record<string, unknown>) => {
    try {
      let resolved: RescoreOptions | null = null

      if (options.db && options.testSet) {
        resolved = {
          databasePath: String(options.db),
          testSetId: String(options.testSet),
          filePath: options.file ? String(options.file) : undefined,
          includeHuman: Boolean(options.includeHuman),
          dryRun: !options.apply,
        }
      } else {
        resolved = await promptForOptions()
      }

      const testSet = loadTestSetById(resolved.testSetId, resolved.filePath)
      if (!testSet) {
        console.error(chalk.red('Could not find matching test set JSON in ./test-sets'))
        process.exit(1)
      }

      const mazeMap = buildMazeMap(testSet)
      const db = initDatabase(resolved.databasePath)
      const query = db.query(
        'SELECT id, maze_id, outcome, parsed_moves, is_human FROM evaluations WHERE test_set_id = ?',
      )
      const rows = query.all(resolved.testSetId) as Array<{
        id: string
        maze_id: string
        outcome: EvaluationOutcome
        parsed_moves: string | null
        is_human: number
      }>

      const updateQuery = db.query(
        'UPDATE evaluations SET outcome = ?, moves_executed = ?, final_position = ?, solution_length = ?, efficiency = ?, shortest_path = ? WHERE id = ?',
      )

      let total = 0
      let skippedHuman = 0
      let skippedNoMoves = 0
      let skippedMissingMaze = 0
      let skippedNoParsed = 0
      let updated = 0
      let unchanged = 0
      const transitions = new Map<string, number>()

      for (const row of rows) {
        total++
        if (row.is_human === 1 && !resolved.includeHuman) {
          skippedHuman++
          continue
        }

        if (!row.parsed_moves) {
          skippedNoParsed++
          continue
        }

        let moves: MoveAction[]
        try {
          moves = JSON.parse(row.parsed_moves) as MoveAction[]
        } catch {
          skippedNoParsed++
          continue
        }

        const maze = mazeMap.get(row.maze_id)
        if (!maze) {
          skippedMissingMaze++
          continue
        }

        if (!Array.isArray(moves)) {
          skippedNoParsed++
          continue
        }

        if (moves.length === 0) {
          skippedNoMoves++
        }

        const next = computeOutcome(maze, moves)
        const transitionKey = `${row.outcome} -> ${next.outcome}`
        transitions.set(transitionKey, (transitions.get(transitionKey) ?? 0) + 1)

        if (!resolved.dryRun) {
          updateQuery.run(
            next.outcome,
            next.movesExecuted,
            next.finalPosition,
            next.solutionLength,
            next.efficiency,
            next.shortestPath,
            row.id,
          )
        }

        if (resolved.dryRun) {
          if (row.outcome !== next.outcome) {
            updated++
          } else {
            unchanged++
          }
        } else if (row.outcome !== next.outcome) {
          updated++
        } else {
          unchanged++
        }
      }

      closeDatabase()

      console.log(chalk.bold('\nRescore Summary'))
      console.log(chalk.dim('─'.repeat(50)))
      console.log(`Total evaluations: ${total}`)
      console.log(`Updated outcomes: ${updated}`)
      console.log(`Unchanged outcomes: ${unchanged}`)
      console.log(`Skipped (human): ${skippedHuman}`)
      console.log(`Skipped (no parsed moves): ${skippedNoParsed}`)
      console.log(`Skipped (missing maze): ${skippedMissingMaze}`)
      console.log(`Skipped (empty moves): ${skippedNoMoves}`)

      if (transitions.size > 0) {
        console.log('\nOutcome transitions:')
        for (const [key, count] of transitions) {
          console.log(`  ${key}: ${count}`)
        }
      }

      if (resolved.dryRun) {
        console.log(chalk.yellow('\nDry run complete. Re-run with --apply to persist updates.'))
      } else {
        console.log(chalk.green('\nRescore complete. Database updated.'))
      }
    } catch (err) {
      if (err instanceof ExitPromptError) {
        console.log('\nCancelled')
        return
      }
      console.error(err)
      process.exit(1)
    }
  })
