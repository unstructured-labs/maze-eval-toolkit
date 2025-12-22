/**
 * Path validation utilities for validating recorded paths against constraints.
 *
 * This is used in the UI to validate:
 * - AI-executed paths against custom constraints
 * - Recorded playthroughs during maze editing
 *
 * Unlike core's validateSolutionWithConstraints which replays moves on a grid,
 * this validates pre-computed paths (where positions are already calculated).
 */

import { checkRequiredSubsequences, checkRequiredTiles } from '@/core/constraints'
import type { Position, RequiredMove, RequirementType } from '../types'

export interface PathConstraints {
  requirementType: RequirementType
  requiredSolutionSubsequences?: RequiredMove[][]
  requiredTiles?: Position[]
}

export interface PathValidationResult {
  reachesGoal: boolean
  constraintsSatisfied?: boolean
  constraintError?: string
  matchedPathIndex?: number
}

/**
 * Validate a recorded path against maze constraints.
 *
 * This validates paths where positions are already computed, such as:
 * - AI-executed moves that have been tracked
 * - User-recorded playthroughs
 *
 * @param path - The recorded path (moves with resulting positions)
 * @param start - Starting position
 * @param goal - Goal position
 * @param constraints - The constraints to validate against
 */
export function validatePath(
  path: RequiredMove[],
  start: Position,
  goal: Position,
  constraints: PathConstraints,
): PathValidationResult {
  // Check if path reaches goal
  const lastMove = path.length > 0 ? path[path.length - 1] : undefined
  const finalPosition = lastMove?.position ?? start
  const reachesGoal = finalPosition.x === goal.x && finalPosition.y === goal.y

  // If no constraints, just check if it reaches goal
  if (!constraints.requirementType) {
    return {
      reachesGoal,
      constraintsSatisfied: true,
    }
  }

  // Build visited positions list (including start)
  const visitedPositions: Position[] = [{ ...start }]
  for (const move of path) {
    visitedPositions.push({ ...move.position })
  }

  // Check constraints based on type
  let constraintsSatisfied = true
  let constraintError: string | undefined
  let matchedPathIndex: number | undefined

  if (constraints.requirementType === 'REQUIRED_SUBSEQUENCE') {
    const result = checkRequiredSubsequences(path, constraints.requiredSolutionSubsequences ?? [])
    constraintsSatisfied = result.satisfied
    constraintError = result.error
    matchedPathIndex = result.matchedPathIndex
  } else if (constraints.requirementType === 'REQUIRED_TILES') {
    const result = checkRequiredTiles(visitedPositions, constraints.requiredTiles ?? [])
    constraintsSatisfied = result.satisfied
    constraintError = result.error
  }

  return {
    reachesGoal,
    constraintsSatisfied,
    constraintError,
    matchedPathIndex,
  }
}
