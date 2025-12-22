/**
 * LLM service for maze solving using OpenRouter
 */

import { formatDuration } from '../lib/format'
import { extractOpenRouterCost } from '../lib/openrouter-types'
import {
  type LLMConfig,
  LLMParseError,
  type LLMResponseStats,
  type LogCallback,
  createOpenRouterClient,
} from '../shared/llm-client'

export type { LLMConfig, LLMResponseStats, LogCallback }
export { LLMParseError }

export type SpecialAction = 'GOAL_UNREACHABLE' | 'UNDECIDED' | 'INSUFFICIENT_TIME'

export interface MazeSolutionResponse {
  moves: Array<{ action: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' }>
  comments?: string
  specialAction?: SpecialAction
  reasoning?: string
  stats?: LLMResponseStats
  rawResponse?: string
}

export interface SingleMoveResponse {
  action: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
  comments?: string
  specialAction?: SpecialAction
  reasoning?: string
  stats?: LLMResponseStats
  rawResponse?: string
}

type MoveAction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
const VALID_ACTIONS = ['UP', 'DOWN', 'LEFT', 'RIGHT'] as const
const SPECIAL_ACTIONS: SpecialAction[] = ['GOAL_UNREACHABLE', 'UNDECIDED', 'INSUFFICIENT_TIME']

/**
 * Try to extract a special action from the response content
 * Returns the special action if found, null otherwise
 */
function extractSpecialAction(content: string): SpecialAction | null {
  // Look for special action in JSON format: { "action": "GOAL_UNREACHABLE" } or [{ "action": "GOAL_UNREACHABLE" }]
  for (const action of SPECIAL_ACTIONS) {
    // Check for object format: { "action": "GOAL_UNREACHABLE" }
    const objectPattern = new RegExp(`\\{\\s*"action"\\s*:\\s*"${action}"\\s*\\}`, 'i')
    if (objectPattern.test(content)) {
      return action
    }

    // Check for array with single item: [{ "action": "GOAL_UNREACHABLE" }]
    const arrayPattern = new RegExp(`\\[\\s*\\{\\s*"action"\\s*:\\s*"${action}"\\s*\\}\\s*\\]`, 'i')
    if (arrayPattern.test(content)) {
      return action
    }

    // Check for plain text mention (e.g., "GOAL_UNREACHABLE" or just GOAL_UNREACHABLE)
    const plainPattern = new RegExp(`\\b${action}\\b`, 'i')
    if (plainPattern.test(content)) {
      return action
    }
  }

  return null
}

/**
 * Validate and normalize an array of moves
 * Returns normalized moves array or null if invalid
 */
function validateMoves(parsed: unknown): Array<{ action: MoveAction }> | null {
  if (!Array.isArray(parsed)) return null
  if (parsed.length === 0) return null

  const moves: Array<{ action: MoveAction }> = []
  for (const move of parsed) {
    if (!move?.action || typeof move.action !== 'string') return null
    const action = move.action.toUpperCase()
    if (!VALID_ACTIONS.includes(action as MoveAction)) return null
    moves.push({ action: action as MoveAction })
  }
  return moves
}

/**
 * Try to parse moves from a JSON string
 */
function tryParseJson(jsonStr: string): Array<{ action: MoveAction }> | null {
  try {
    const parsed = JSON.parse(jsonStr)
    return validateMoves(parsed)
  } catch {
    return null
  }
}

interface ExtractedResponse {
  moves: Array<{ action: MoveAction }>
  comments?: string
}

/**
 * Try to parse the new object format: { comments: string, actions: [...] }
 */
function tryParseObjectFormat(content: string): ExtractedResponse | null {
  // Look for JSON object in markdown code block
  const codeBlockMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
  if (codeBlockMatch?.[1]) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1])
      if (parsed.actions && Array.isArray(parsed.actions)) {
        const moves = validateMoves(parsed.actions)
        if (moves) {
          return { moves, comments: parsed.comments }
        }
      }
    } catch {
      // Continue to next strategy
    }
  }

  // Look for JSON object with "actions" field
  const objectMatch = content.match(/\{[\s\S]*"actions"\s*:\s*\[[\s\S]*?\][\s\S]*?\}/)
  if (objectMatch) {
    try {
      const parsed = JSON.parse(objectMatch[0])
      if (parsed.actions && Array.isArray(parsed.actions)) {
        const moves = validateMoves(parsed.actions)
        if (moves) {
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
 * Extract moves array from LLM response content using multiple strategies
 */
function extractMovesFromContent(content: string): ExtractedResponse | null {
  // Strategy 0: Try the new object format first { comments: ..., actions: [...] }
  const objectResult = tryParseObjectFormat(content)
  if (objectResult) return objectResult

  // Strategy 1: Look for JSON array in markdown code block (```json ... ```)
  const codeBlockMatch = content.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/)
  if (codeBlockMatch?.[1]) {
    const moves = tryParseJson(codeBlockMatch[1])
    if (moves) return { moves }
  }

  // Strategy 2: Find the LAST JSON array in the response (most likely to be the answer)
  const allArrayMatches = [...content.matchAll(/\[[\s\S]*?\]/g)]
  if (allArrayMatches.length > 0) {
    // Try from last to first
    for (let i = allArrayMatches.length - 1; i >= 0; i--) {
      const match = allArrayMatches[i]?.[0]
      if (match) {
        const moves = tryParseJson(match)
        if (moves) return { moves }
      }
    }
  }

  // Strategy 3: Try greedy match for the first complete array (original behavior)
  const greedyMatch = content.match(/\[[\s\S]*\]/)
  if (greedyMatch) {
    const moves = tryParseJson(greedyMatch[0])
    if (moves) return { moves }
  }

  // Strategy 4: Look for comma-separated list of actions (e.g., "DOWN, RIGHT, UP, LEFT")
  // This handles cases like "Moves: DOWN, RIGHT, RIGHT, UP, RIGHT..."
  const commaSeparatedMatch = content.match(
    /(?:moves?:?\s*)?((?:UP|DOWN|LEFT|RIGHT)(?:\s*,\s*(?:UP|DOWN|LEFT|RIGHT))+)/i,
  )
  if (commaSeparatedMatch?.[1]) {
    const actions = commaSeparatedMatch[1].split(/\s*,\s*/)
    const moves: Array<{ action: MoveAction }> = []
    for (const action of actions) {
      const normalized = action.trim().toUpperCase()
      if (VALID_ACTIONS.includes(normalized as MoveAction)) {
        moves.push({ action: normalized as MoveAction })
      }
    }
    if (moves.length > 0) return { moves }
  }

  return null
}

/**
 * Call OpenRouter API to get maze solution
 */
export async function getMazeSolution(
  prompt: string,
  config: LLMConfig,
  logCallback?: LogCallback,
): Promise<MazeSolutionResponse> {
  const client = createOpenRouterClient(config.apiKey)

  try {
    logCallback?.('request', 'Preparing API request...')

    const requestStartTime = Date.now()
    logCallback?.('request', 'Sending API request to OpenRouter...')

    const completion = await client.chat.completions.create({
      model: config.model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      // @ts-expect-error OpenRouter-specific fields
      usage: { include: true },
      reasoning: {},
    })

    const requestDuration = Date.now() - requestStartTime
    const outputTokens = completion.usage?.completion_tokens ?? 0
    const cost = extractOpenRouterCost(completion.usage)
    logCallback?.('response', `API response received (${formatDuration(requestDuration)})`)

    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from LLM')
    }

    // @ts-expect-error OpenRouter-specific reasoning field
    const reasoning = completion.choices[0]?.message?.reasoning as string | undefined
    if (reasoning && reasoning !== '') {
      console.log('[REASONING]:')
      console.log(reasoning)
      console.log('--------------------------------------------------------------')
    }

    console.log('[RESPONSE]:')
    console.log(content)

    logCallback?.('response', 'Parsing response...')

    // First check for special actions (GOAL_UNREACHABLE, UNDECIDED)
    const specialAction = extractSpecialAction(content)
    if (specialAction) {
      logCallback?.('success', `Detected special action: ${specialAction}`)
      return {
        moves: [],
        specialAction,
        reasoning,
        rawResponse: content,
        stats: {
          durationMs: requestDuration,
          outputTokens,
          cost,
        },
      }
    }

    // Try to extract moves using multiple strategies
    const extracted = extractMovesFromContent(content)
    if (!extracted) {
      throw new LLMParseError('Could not extract valid moves from response', content)
    }

    logCallback?.('success', `Parsed ${extracted.moves.length} moves from response`)

    return {
      moves: extracted.moves,
      comments: extracted.comments,
      reasoning,
      rawResponse: content,
      stats: {
        durationMs: requestDuration,
        outputTokens,
        cost,
      },
    }
  } catch (error) {
    // Re-throw LLMParseError as-is to preserve the raw response
    if (error instanceof LLMParseError) {
      logCallback?.('error', `Parse error: ${error.message}`)
      console.error('LLM API error:', error)
      console.error('Raw AI response:', error.rawResponse)
      throw error
    }

    let errorMsg = error instanceof Error ? error.message : 'Unknown error'

    // Provide more helpful error messages for common issues
    if (errorMsg === 'Failed to fetch') {
      errorMsg =
        'Failed to fetch - this could be a network issue, OpenRouter API being unavailable, or the model being temporarily unavailable. Check your internet connection and try again.'
    } else if (errorMsg.includes('401')) {
      errorMsg = 'Invalid API key - please check your OpenRouter API key'
    } else if (errorMsg.includes('429')) {
      errorMsg = 'Rate limited - please wait a moment and try again'
    } else if (errorMsg.includes('503') || errorMsg.includes('502')) {
      errorMsg = 'OpenRouter API is temporarily unavailable - please try again later'
    }

    logCallback?.('error', `API error: ${errorMsg}`)
    console.error('LLM API error:', error)
    throw new Error(errorMsg)
  }
}

/**
 * Extract a single move action from LLM response content
 */
function extractSingleMoveFromContent(
  content: string,
): { action: MoveAction; comments?: string } | null {
  // Strategy 1: Look for JSON object with single "action" field: {"action": "UP", "comments": "..."}
  const objectMatch = content.match(/\{[\s\S]*"action"\s*:\s*"([A-Z]+)"[\s\S]*?\}/i)
  if (objectMatch) {
    try {
      const parsed = JSON.parse(objectMatch[0])
      const action = parsed.action?.toUpperCase()
      if (VALID_ACTIONS.includes(action as MoveAction)) {
        return { action: action as MoveAction, comments: parsed.comments }
      }
    } catch {
      // Try simpler extraction
      const action = objectMatch[1]?.toUpperCase()
      if (VALID_ACTIONS.includes(action as MoveAction)) {
        return { action: action as MoveAction }
      }
    }
  }

  // Strategy 2: Look for plain action word
  const plainMatch = content.match(/\b(UP|DOWN|LEFT|RIGHT)\b/i)
  if (plainMatch?.[1]) {
    const action = plainMatch[1].toUpperCase()
    if (VALID_ACTIONS.includes(action as MoveAction)) {
      return { action: action as MoveAction }
    }
  }

  return null
}

/**
 * Call OpenRouter API to get a single move for move-by-move execution
 */
export async function getSingleMove(
  prompt: string,
  config: LLMConfig,
  logCallback?: LogCallback,
): Promise<SingleMoveResponse> {
  const client = createOpenRouterClient(config.apiKey)

  try {
    logCallback?.('request', 'Preparing API request...')

    const requestStartTime = Date.now()
    logCallback?.('request', 'Sending API request to OpenRouter...')

    const completion = await client.chat.completions.create({
      model: config.model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      // @ts-expect-error OpenRouter-specific fields
      usage: { include: true },
      reasoning: {},
    })

    const requestDuration = Date.now() - requestStartTime
    const outputTokens = completion.usage?.completion_tokens ?? 0
    const cost = extractOpenRouterCost(completion.usage)
    logCallback?.('response', `API response received (${formatDuration(requestDuration)})`)

    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from LLM')
    }

    // @ts-expect-error OpenRouter-specific reasoning field
    const reasoning = completion.choices[0]?.message?.reasoning as string | undefined
    if (reasoning && reasoning !== '') {
      console.log('[REASONING]:')
      console.log(reasoning)
      console.log('--------------------------------------------------------------')
    }

    console.log('[RESPONSE]:')
    console.log(content)

    logCallback?.('response', 'Parsing response...')

    // First check for special actions
    const specialAction = extractSpecialAction(content)
    if (specialAction) {
      logCallback?.('success', `Detected special action: ${specialAction}`)
      return {
        action: 'UP', // Placeholder, won't be used
        specialAction,
        reasoning,
        rawResponse: content,
        stats: {
          durationMs: requestDuration,
          outputTokens,
          cost,
        },
      }
    }

    // Try to extract single move
    const extracted = extractSingleMoveFromContent(content)
    if (!extracted) {
      throw new LLMParseError('Could not extract valid move from response', content)
    }

    logCallback?.('success', `Parsed move: ${extracted.action}`)

    return {
      action: extracted.action,
      comments: extracted.comments,
      reasoning,
      rawResponse: content,
      stats: {
        durationMs: requestDuration,
        outputTokens,
        cost,
      },
    }
  } catch (error) {
    // Re-throw LLMParseError as-is to preserve the raw response
    if (error instanceof LLMParseError) {
      logCallback?.('error', `Parse error: ${error.message}`)
      console.error('LLM API error:', error)
      console.error('Raw AI response:', error.rawResponse)
      throw error
    }

    let errorMsg = error instanceof Error ? error.message : 'Unknown error'

    if (errorMsg === 'Failed to fetch') {
      errorMsg =
        'Failed to fetch - network issue or API unavailable. Check your connection and try again.'
    } else if (errorMsg.includes('401')) {
      errorMsg = 'Invalid API key - please check your OpenRouter API key'
    } else if (errorMsg.includes('429')) {
      errorMsg = 'Rate limited - please wait a moment and try again'
    } else if (errorMsg.includes('503') || errorMsg.includes('502')) {
      errorMsg = 'OpenRouter API is temporarily unavailable - please try again later'
    }

    logCallback?.('error', `API error: ${errorMsg}`)
    console.error('LLM API error:', error)
    throw new Error(errorMsg)
  }
}
