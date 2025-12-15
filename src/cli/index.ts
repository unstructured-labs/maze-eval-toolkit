#!/usr/bin/env bun
/**
 * LMIQ v1 Beta CLI
 *
 * Commands:
 * - generate: Generate a test set of mazes
 * - evaluate: Run model evaluation on a test set
 * - score: Compute LMIQ scores from evaluation results
 */

import { program } from 'commander'
import { evaluateCommand } from './evaluate'
import { generateCommand } from './generate'
import { scoreCommand } from './score'

program.name('lmiq').description('LMIQ v1 Beta - AI Maze Solving Benchmark').version('0.1.0')

program.addCommand(generateCommand)
program.addCommand(evaluateCommand)
program.addCommand(scoreCommand)

program.parse()
