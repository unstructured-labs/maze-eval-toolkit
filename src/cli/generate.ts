/**
 * CLI command for generating test sets
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { ExitPromptError } from '@inquirer/core'
import { checkbox, confirm, input } from '@inquirer/prompts'
import chalk from 'chalk'
import { Command } from 'commander'
import { v4 as uuidv4 } from 'uuid'
import { generateMaze } from '../core/maze-generator'
import { generateAllPrompts } from '../core/maze-renderer'
import {
  DIFFICULTIES,
  type Difficulty,
  type MazeWithPrompts,
  type TestSetFile,
} from '../core/types'

interface GenerateOptions {
  count: number
  difficulties: Difficulty[]
  outputPath: string
  name: string
}

async function promptForOptions(): Promise<GenerateOptions> {
  console.log(chalk.bold('\nLMIQ Test Set Generator'))
  console.log(chalk.dim('─'.repeat(40)))
  console.log()

  const name = await input({
    message: 'Test set name:',
    default: 'LMIQ Test Set',
  })

  const countStr = await input({
    message: 'Mazes per difficulty:',
    default: '10',
    validate: (value) => {
      const num = Number.parseInt(value, 10)
      if (Number.isNaN(num) || num < 1) return 'Please enter a positive number'
      return true
    },
  })
  const count = Number.parseInt(countStr, 10)

  const difficulties = (await checkbox({
    message: 'Select difficulties:',
    choices: DIFFICULTIES.map((d) => ({ name: d, value: d, checked: true })),
    required: true,
  })) as Difficulty[]

  const outputPath = await input({
    message: 'Output file path:',
    default: './test-sets/test-set.json',
  })

  console.log()
  const confirmed = await confirm({
    message: `Generate ${count} mazes for ${difficulties.length} difficulties (${count * difficulties.length} total)?`,
    default: true,
  })

  if (!confirmed) {
    console.log(chalk.yellow('Cancelled'))
    process.exit(0)
  }

  return { count, difficulties, outputPath, name }
}

async function runGeneration(options: GenerateOptions) {
  const { count, difficulties, outputPath, name } = options

  console.log()
  console.log(chalk.bold('Generating mazes...'))
  console.log(chalk.dim('─'.repeat(40)))

  const testSet: TestSetFile = {
    id: uuidv4(),
    name,
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    mazes: {
      simple: [],
      easy: [],
      medium: [],
      hard: [],
      nightmare: [],
      horror: [],
    },
    summary: {
      totalMazes: 0,
      byDifficulty: {
        simple: 0,
        easy: 0,
        medium: 0,
        hard: 0,
        nightmare: 0,
        horror: 0,
      },
    },
  }

  let totalGenerated = 0

  for (const difficulty of difficulties) {
    console.log(chalk.cyan(`\nGenerating ${count} ${difficulty} mazes...`))
    const mazes: MazeWithPrompts[] = []

    for (let i = 0; i < count; i++) {
      process.stdout.write(`  [${i + 1}/${count}]`)

      const maze = generateMaze(difficulty)
      if (!maze) {
        console.log(chalk.yellow(' - Failed to generate valid maze (max attempts reached)'))
        continue
      }

      // Generate all prompts
      const prompts = generateAllPrompts(maze)

      const mazeWithPrompts: MazeWithPrompts = {
        ...maze,
        prompts,
      }

      mazes.push(mazeWithPrompts)
      process.stdout.write(
        chalk.green(` - ${maze.width}x${maze.height}, shortest path: ${maze.shortestPath}\n`),
      )
    }

    testSet.mazes[difficulty] = mazes
    testSet.summary.byDifficulty[difficulty] = mazes.length
    totalGenerated += mazes.length
  }

  testSet.summary.totalMazes = totalGenerated

  // Ensure output directory exists
  const dir = dirname(outputPath)
  mkdirSync(dir, { recursive: true })

  // Write output file
  writeFileSync(outputPath, JSON.stringify(testSet, null, 2))

  console.log()
  console.log(chalk.dim('─'.repeat(40)))
  console.log(chalk.bold.green(`Generated ${totalGenerated} mazes`))
  console.log(`Output written to: ${chalk.cyan(outputPath)}`)

  // Summary table
  console.log()
  console.log(chalk.bold('Summary:'))
  for (const difficulty of DIFFICULTIES) {
    const c = testSet.summary.byDifficulty[difficulty]
    if (c > 0) {
      console.log(`  ${difficulty.padEnd(12)} ${c}`)
    }
  }
}

export const generateCommand = new Command('generate')
  .description('Generate a test set of mazes')
  .option('-n, --count <number>', 'Number of mazes per difficulty')
  .option('-d, --difficulties <list>', 'Comma-separated list of difficulties')
  .option('-o, --output <path>', 'Output JSON file path')
  .option('--name <name>', 'Test set name')
  .option('-i, --interactive', 'Run in interactive mode (default if no options provided)')
  .action(async (options) => {
    // Determine if we should run interactive mode
    const hasOptions = options.count || options.difficulties || options.output || options.name
    const interactive = options.interactive || !hasOptions

    let genOptions: GenerateOptions

    if (interactive) {
      try {
        genOptions = await promptForOptions()
      } catch (err) {
        if (err instanceof ExitPromptError) {
          console.log(chalk.yellow('\nCancelled'))
          process.exit(0)
        }
        throw err
      }
    } else {
      // Parse CLI options with defaults
      const count = options.count ? Number.parseInt(options.count, 10) : 10
      const difficulties = options.difficulties
        ? (options.difficulties.split(',').map((d: string) => d.trim()) as Difficulty[])
        : DIFFICULTIES
      const outputPath = options.output || './test-sets/test-set.json'
      const name = options.name || 'LMIQ Test Set'

      // Validate difficulties
      for (const d of difficulties) {
        if (!DIFFICULTIES.includes(d)) {
          console.error(chalk.red(`Invalid difficulty: ${d}`))
          console.error(`Valid difficulties: ${DIFFICULTIES.join(', ')}`)
          process.exit(1)
        }
      }

      genOptions = { count, difficulties, outputPath, name }

      console.log(chalk.bold('\nLMIQ Test Set Generator'))
      console.log(chalk.dim('─'.repeat(40)))
      console.log(`Difficulties: ${difficulties.join(', ')}`)
      console.log(`Mazes per difficulty: ${count}`)
      console.log(`Output: ${outputPath}`)
    }

    await runGeneration(genOptions)
  })
