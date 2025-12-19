/**
 * Response parsing utilities for LLM outputs
 */

import type { MoveAction } from '../core/types'
import { VALID_MOVES } from '../core/types'

/**
 * Parsed response from LLM
 */
export interface ParsedResponse {
  moves: MoveAction[] | null
  comments?: string
  error?: string
}

/**
 * Validate and normalize an array of moves
 */
function validateMoves(parsed: unknown, allowEmpty = false): MoveAction[] | null {
  if (!Array.isArray(parsed)) return null
  if (parsed.length === 0) return allowEmpty ? [] : null

  const moves: MoveAction[] = []
  for (const move of parsed) {
    // Handle { action: "UP" } format
    if (move?.action && typeof move.action === 'string') {
      const action = move.action.toUpperCase() as MoveAction
      if (VALID_MOVES.includes(action)) {
        moves.push(action)
        continue
      }
    }
    // Handle plain string "UP" format
    if (typeof move === 'string') {
      const action = move.toUpperCase() as MoveAction
      if (VALID_MOVES.includes(action)) {
        moves.push(action)
        continue
      }
    }
    // Invalid move format
    return null
  }
  return moves
}

/**
 * Try to parse JSON from a string
 */
function tryParseJson(jsonStr: string, allowEmpty = true): MoveAction[] | null {
  try {
    const parsed = JSON.parse(jsonStr)
    return validateMoves(parsed, allowEmpty)
  } catch {
    return null
  }
}

/**
 * Try to parse the object format: { comments: string, actions: [...] }
 */
function tryParseObjectFormat(content: string): ParsedResponse | null {
  // Look for JSON object in markdown code block
  const codeBlockMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
  if (codeBlockMatch?.[1]) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1])
      if (parsed.actions && Array.isArray(parsed.actions)) {
        const moves = validateMoves(parsed.actions, true)
        if (moves !== null) {
          return { moves, comments: parsed.comments }
        }
      }
    } catch {
      // Continue to next strategy
    }
  }

  // Look for JSON object with "actions" field
  const objectMatch = content.match(/\{[\s\S]*"actions"\s*:\s*\[[\s\S]*?\][\s\S]*?\}/)
  if (objectMatch?.[0]) {
    try {
      const parsed = JSON.parse(objectMatch[0])
      if (parsed.actions && Array.isArray(parsed.actions)) {
        const moves = validateMoves(parsed.actions, true)
        if (moves !== null) {
          return { moves, comments: parsed.comments }
        }
      }
    } catch {
      // Continue to next strategy
    }
  }

  return null
}

/**
 * Extract moves from LLM response content using multiple strategies
 */
export function parseResponse(content: string): ParsedResponse {
  // Strategy 0: Try the object format first { comments: ..., actions: [...] }
  const objectResult = tryParseObjectFormat(content)
  if (objectResult) return objectResult

  // Strategy 1: Look for JSON array in markdown code block
  const codeBlockMatch = content.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/)
  if (codeBlockMatch?.[1]) {
    const moves = tryParseJson(codeBlockMatch[1])
    if (moves !== null) return { moves }
  }

  // Strategy 2: Find the LAST JSON array in the response
  const allArrayMatches = [...content.matchAll(/\[[\s\S]*?\]/g)]
  if (allArrayMatches.length > 0) {
    // Try from last to first
    for (let i = allArrayMatches.length - 1; i >= 0; i--) {
      const match = allArrayMatches[i]?.[0]
      if (match) {
        const moves = tryParseJson(match)
        if (moves !== null) return { moves }
      }
    }
  }

  // Strategy 3: Try greedy match for the first complete array
  const greedyMatch = content.match(/\[[\s\S]*\]/)
  if (greedyMatch?.[0]) {
    const moves = tryParseJson(greedyMatch[0])
    if (moves !== null) return { moves }
  }

  // Strategy 4: Look for comma-separated list of actions
  const commaSeparatedMatch = content.match(
    /(?:moves?:?\s*)?((?:UP|DOWN|LEFT|RIGHT)(?:\s*,\s*(?:UP|DOWN|LEFT|RIGHT))+)/i,
  )
  if (commaSeparatedMatch?.[1]) {
    const actions = commaSeparatedMatch[1].split(/\s*,\s*/)
    const moves: MoveAction[] = []
    for (const action of actions) {
      const normalized = action.trim().toUpperCase() as MoveAction
      if (VALID_MOVES.includes(normalized)) {
        moves.push(normalized)
      }
    }
    if (moves.length > 0) return { moves }
  }

  // Failed to parse
  return {
    moves: null,
    error: 'Could not extract valid moves from response',
  }
}
