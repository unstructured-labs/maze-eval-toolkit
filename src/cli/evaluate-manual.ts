/**
 * CLI command for evaluating manual solutions against a test set
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { ExitPromptError } from '@inquirer/core'
import { input, select } from '@inquirer/prompts'
import chalk from 'chalk'
import { Command } from 'commander'
import { applyMove, validateSolutionWithConstraints } from '../core/maze-solver'
import type {
  Difficulty,
  EvaluationOutcome,
  MazeWithPrompts,
  MoveAction,
  Position,
  TestSetFile,
} from '../core/types'
import { DIFFICULTIES, VALID_MOVES } from '../core/types'

/**
 * Check if a path reaches the goal by applying moves (ignoring walls)
 */
function checkGoalReached(start: Position, goal: Position, moves: MoveAction[]): boolean {
  let pos = { ...start }
  for (const move of moves) {
    pos = applyMove(pos, move)
    if (pos.x === goal.x && pos.y === goal.y) {
      return true
    }
  }
  return false
}

type SolutionsMap = Record<string, MoveAction[]>

interface EvaluationSummary {
  total: number
  successes: number
  failures: number
  invalidMoves: number
  constraintViolations: number
  noPathFound: number
  parseErrors: number
}

function findTestSets(): string[] {
  const dataDir = './test-sets'
  if (!existsSync(dataDir)) return []
  return readdirSync(dataDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => `${dataDir}/${f}`)
}

function parseSolutionsFile(filePath: string): SolutionsMap | null {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const data = JSON.parse(content)

    // Expect an object keyed by maze UUID
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      console.error(chalk.red('Solutions file must be an object keyed by maze UUID'))
      return null
    }

    const solutions: SolutionsMap = {}
    for (const [mazeId, moves] of Object.entries(data)) {
      if (!Array.isArray(moves)) {
        console.error(chalk.red(`Invalid solution for maze ${mazeId}: expected array of moves`))
        return null
      }

      // Validate each move
      const validatedMoves: MoveAction[] = []
      for (let j = 0; j < moves.length; j++) {
        const move = moves[j]
        if (typeof move !== 'string' || !VALID_MOVES.includes(move as MoveAction)) {
          console.error(chalk.red(`Invalid move for maze ${mazeId}, position ${j}: ${move}`))
          console.error(`Valid moves: ${VALID_MOVES.join(', ')}`)
          return null
        }
        validatedMoves.push(move as MoveAction)
      }

      solutions[mazeId] = validatedMoves
    }

    return solutions
  } catch (err) {
    console.error(chalk.red(`Failed to parse solutions file: ${err}`))
    return null
  }
}

async function promptForOptions(): Promise<{ testSetPath: string; solutionsPath: string }> {
  console.log(chalk.bold('\nLMIQ Manual Solution Evaluation'))
  console.log(chalk.dim('─'.repeat(50)))
  console.log()

  // Find available test sets
  const testSets = findTestSets()
  if (testSets.length === 0) {
    console.error(chalk.red('No test sets found in ./test-sets/'))
    console.error('Run `task generate` to create one')
    process.exit(1)
  }

  const testSetPath = await select({
    message: 'Select test set:',
    choices: testSets.map((t) => ({ name: t, value: t })),
    pageSize: testSets.length,
  })

  const solutionsPath = await input({
    message: 'Path to solutions JSON file:',
    validate: (value) => {
      if (value.length === 0) return 'Path is required'
      if (!existsSync(value)) return 'File not found'
      return true
    },
  })

  return { testSetPath, solutionsPath }
}

function runManualEvaluation(testSetPath: string, solutionsPath: string): void {
  // Load test set
  console.log('\nLoading test set...')
  let testSet: TestSetFile
  try {
    const content = readFileSync(testSetPath, 'utf-8')
    testSet = JSON.parse(content) as TestSetFile
  } catch (err) {
    console.error(chalk.red(`Failed to load test set: ${err}`))
    process.exit(1)
  }

  console.log(`Test Set: ${testSet.name}`)
  console.log(`Total Mazes: ${testSet.summary.totalMazes}`)
  console.log()

  // Load solutions
  console.log('Loading solutions...')
  const solutions = parseSolutionsFile(solutionsPath)
  if (!solutions) {
    process.exit(1)
  }
  const solutionCount = Object.keys(solutions).length
  console.log(`Solutions loaded: ${solutionCount}`)
  console.log()

  // Collect all mazes in order
  const mazesToEvaluate: Array<{
    maze: MazeWithPrompts
    difficulty: Difficulty
  }> = []
  for (const difficulty of DIFFICULTIES) {
    const mazes = testSet.mazes[difficulty]
    if (mazes && mazes.length > 0) {
      for (const maze of mazes) {
        mazesToEvaluate.push({ maze, difficulty })
      }
    }
  }

  // Check for missing solutions
  const missingMazes = mazesToEvaluate.filter(({ maze }) => !(maze.id in solutions))
  if (missingMazes.length > 0) {
    console.error(
      chalk.red(
        `Missing solutions for ${missingMazes.length} mazes. First missing: ${missingMazes[0]?.maze.id}`,
      ),
    )
    process.exit(1)
  }

  // Evaluate each solution
  console.log(chalk.dim('─'.repeat(100)))
  console.log(
    chalk.bold(
      `${'#'.padStart(4)}  ${'Difficulty'.padEnd(12)} ${'Outcome'.padEnd(20)} ${'Steps'.padStart(6)} ${'Valid'.padStart(6)} ${'Shortest'.padStart(8)} ${'Goal'.padStart(6)} ${'Efficiency'.padStart(10)}`,
    ),
  )
  console.log(chalk.dim('─'.repeat(100)))

  const summary: EvaluationSummary = {
    total: 0,
    successes: 0,
    failures: 0,
    invalidMoves: 0,
    constraintViolations: 0,
    noPathFound: 0,
    parseErrors: 0,
  }

  for (let i = 0; i < mazesToEvaluate.length; i++) {
    const { maze, difficulty } = mazesToEvaluate[i]!
    const moves = solutions[maze.id]!
    summary.total++

    let outcome: EvaluationOutcome
    let totalSteps = moves.length
    let validSteps = moves.length
    let goalReached = false
    let efficiencyStr = '-'

    if (moves.length === 0) {
      // Empty solution - model believes no path exists
      outcome = 'no_path_found'
      summary.noPathFound++
      totalSteps = 0
      validSteps = 0
    } else {
      // Check if goal is reached (ignoring walls)
      goalReached = checkGoalReached(maze.start, maze.goal, moves)

      // Validate the solution
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

      // Valid steps = pathLength (stops at first invalid move or goal)
      validSteps = validation.pathLength

      if (!validation.isValid) {
        outcome = 'invalid_move'
        summary.invalidMoves++
      } else if (validation.reachesGoal) {
        goalReached = true // Ensure it's true if validation says so
        if (validation.constraintsSatisfied === false) {
          outcome = 'constraint_violated'
          summary.constraintViolations++
        } else {
          outcome = 'success'
          summary.successes++
          efficiencyStr =
            validation.efficiency !== null ? `${(validation.efficiency * 100).toFixed(1)}%` : '-'
        }
      } else {
        outcome = 'failure'
        summary.failures++
      }
    }

    // Format output
    const indexStr = String(i + 1).padStart(4)
    const diffStr = difficulty.padEnd(12)
    const outcomeColor =
      outcome === 'success'
        ? chalk.green
        : outcome === 'constraint_violated' || outcome === 'no_path_found'
          ? chalk.yellow
          : chalk.red
    const outcomeStr = outcomeColor(outcome.padEnd(20))
    const stepsStr = String(totalSteps).padStart(6)
    const validStr = String(validSteps).padStart(6)
    const shortestStr = String(maze.shortestPath).padStart(8)
    const goalStr = (goalReached ? chalk.green('Yes') : chalk.red('No')).padStart(6 + 10) // +10 for ANSI codes

    console.log(
      `${indexStr}  ${diffStr} ${outcomeStr} ${stepsStr} ${validStr} ${shortestStr} ${goalStr} ${efficiencyStr.padStart(10)}`,
    )
  }

  // Print summary
  console.log()
  console.log(chalk.dim('─'.repeat(100)))
  console.log(chalk.bold('Summary'))
  console.log(`Total: ${summary.total}`)
  console.log(
    `Successes: ${chalk.green(summary.successes)} (${((summary.successes / summary.total) * 100).toFixed(1)}%)`,
  )
  console.log(`Failures: ${chalk.red(summary.failures)}`)
  console.log(`Invalid Moves: ${chalk.red(summary.invalidMoves)}`)
  console.log(`Constraint Violations: ${chalk.yellow(summary.constraintViolations)}`)
  console.log(`No Path Found: ${chalk.yellow(summary.noPathFound)}`)
}

export const evaluateManualCommand = new Command('evaluate-manual')
  .description('Evaluate manual solutions against a test set')
  .option('-t, --test-set <path>', 'Path to test set JSON file')
  .option('-s, --solutions <path>', 'Path to solutions JSON file')
  .option('-i, --interactive', 'Run in interactive mode (default if no options provided)')
  .action(async (options) => {
    const hasOptions = options.testSet && options.solutions
    const interactive = options.interactive || !hasOptions

    if (interactive) {
      try {
        const { testSetPath, solutionsPath } = await promptForOptions()
        runManualEvaluation(testSetPath, solutionsPath)
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
    const testSetPath = options.testSet as string
    const solutionsPath = options.solutions as string

    if (!testSetPath) {
      console.error(chalk.red('Test set path required. Use -t or --test-set'))
      process.exit(1)
    }
    if (!solutionsPath) {
      console.error(chalk.red('Solutions path required. Use -s or --solutions'))
      process.exit(1)
    }
    if (!existsSync(testSetPath)) {
      console.error(chalk.red(`Test set not found: ${testSetPath}`))
      process.exit(1)
    }
    if (!existsSync(solutionsPath)) {
      console.error(chalk.red(`Solutions file not found: ${solutionsPath}`))
      process.exit(1)
    }

    runManualEvaluation(testSetPath, solutionsPath)
  })
