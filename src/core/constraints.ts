import type { Position, RequiredMove } from './types'
import { posToKey } from './types'

export interface ConstraintCheckResult {
  satisfied: boolean
  error?: string
  matchedPathIndex?: number
}

/**
 * Check if required moves appear as a subsequence (in order, not necessarily contiguous).
 */
export function checkRequiredSubsequence(
  executedMoves: RequiredMove[],
  required: RequiredMove[],
): ConstraintCheckResult {
  if (required.length === 0) {
    return { satisfied: true }
  }

  let requiredIndex = 0

  for (const executed of executedMoves) {
    if (requiredIndex >= required.length) break

    const req = required[requiredIndex]!
    if (
      executed.move === req.move &&
      executed.position.x === req.position.x &&
      executed.position.y === req.position.y
    ) {
      requiredIndex++
    }
  }

  if (requiredIndex < required.length) {
    const missing = required[requiredIndex]!
    return {
      satisfied: false,
      error: `Missing required move: ${missing.move} to (${missing.position.x},${missing.position.y}). Only matched ${requiredIndex}/${required.length} required moves.`,
    }
  }

  return { satisfied: true }
}

/**
 * Check if solution matches ANY of the required subsequence paths (OR logic).
 */
export function checkRequiredSubsequences(
  executedMoves: RequiredMove[],
  requiredPaths: RequiredMove[][],
): ConstraintCheckResult {
  if (requiredPaths.length === 0) {
    return { satisfied: true }
  }

  for (let i = 0; i < requiredPaths.length; i++) {
    const result = checkRequiredSubsequence(executedMoves, requiredPaths[i]!)
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
 * Check if all required tiles were visited (order doesn't matter).
 */
export function checkRequiredTiles(
  visitedPositions: Position[],
  required: Position[],
): ConstraintCheckResult {
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
      error: `Missing required tiles: ${missingStr}. Visited ${visitedSet.size} unique positions but missed ${missingTiles.length} required tiles.`,
    }
  }

  return { satisfied: true }
}
