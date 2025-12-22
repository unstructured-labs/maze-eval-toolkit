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

import type { Position, RequiredMove, RequirementType } from '../types'
import { posToKey } from '../types'

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
 * Check if required moves appear as a subsequence (in order, but not necessarily contiguous)
 * The path can revisit positions, go elsewhere, and come back - as long as the required
 * sequence eventually appears in order within the full path.
 */
function checkRequiredSubsequence(
  executedMoves: RequiredMove[],
  required: RequiredMove[],
): { satisfied: boolean; error?: string } {
  if (required.length === 0) {
    return { satisfied: true }
  }

  let requiredIndex = 0

  for (const executed of executedMoves) {
    if (requiredIndex >= required.length) break

    const req = required[requiredIndex]
    if (!req) break
    // Check if move matches AND position matches
    if (
      executed.move === req.move &&
      executed.position.x === req.position.x &&
      executed.position.y === req.position.y
    ) {
      requiredIndex++
    }
  }

  if (requiredIndex < required.length) {
    const missing = required[requiredIndex]
    if (!missing) return { satisfied: false, error: 'Invalid required sequence' }
    return {
      satisfied: false,
      error: `Missing required move: ${missing.move} to (${missing.position.x},${missing.position.y}). Only matched ${requiredIndex}/${required.length} required moves.`,
    }
  }

  return { satisfied: true }
}

/**
 * Check if solution matches ANY of the required subsequence paths (OR logic)
 */
function checkRequiredSubsequences(
  executedMoves: RequiredMove[],
  requiredPaths: RequiredMove[][],
): { satisfied: boolean; error?: string; matchedPathIndex?: number } {
  if (requiredPaths.length === 0) {
    return { satisfied: true }
  }

  // Try each path - if ANY matches, return satisfied
  for (let i = 0; i < requiredPaths.length; i++) {
    const pathToCheck = requiredPaths[i]
    if (!pathToCheck) continue
    const result = checkRequiredSubsequence(executedMoves, pathToCheck)
    if (result.satisfied) {
      return { satisfied: true, matchedPathIndex: i }
    }
  }

  return {
    satisfied: false,
    error: `Solution did not match any of the ${requiredPaths.length} valid subsequence path(s)`,
  }
}

/**
 * Check if all required tiles were visited (order doesn't matter)
 */
function checkRequiredTiles(
  visitedPositions: Position[],
  required: Position[],
): { satisfied: boolean; error?: string } {
  if (required.length === 0) {
    return { satisfied: true }
  }

  const visitedSet = new Set(visitedPositions.map((p) => posToKey(p)))
  const missingTiles: Position[] = []

  for (const tile of required) {
    if (!visitedSet.has(posToKey(tile))) {
      missingTiles.push(tile)
    }
  }

  if (missingTiles.length > 0) {
    const missingStr = missingTiles.map((t) => `(${t.x},${t.y})`).join(', ')
    return {
      satisfied: false,
      error: `Missing required tiles: ${missingStr}`,
    }
  }

  return { satisfied: true }
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
