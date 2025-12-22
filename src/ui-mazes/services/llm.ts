/**
 * LLM service for maze solving using OpenRouter
 */

import type { MoveAction, SpecialAction } from '@/core/types'
import { parseResponse, parseSingleMoveResponse } from '@/llm/parser'
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

export interface MazeSolutionResponse {
  moves: Array<{ action: MoveAction }>
  comments?: string
  specialAction?: SpecialAction
  reasoning?: string
  stats?: LLMResponseStats
  rawResponse?: string
}

export interface SingleMoveResponse {
  action: MoveAction
  comments?: string
  specialAction?: SpecialAction
  reasoning?: string
  stats?: LLMResponseStats
  rawResponse?: string
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

    const parsed = parseResponse(content)
    if (parsed.specialAction) {
      logCallback?.('success', `Detected special action: ${parsed.specialAction}`)
      return {
        moves: [],
        specialAction: parsed.specialAction,
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
    if (!parsed.moves) {
      throw new LLMParseError(
        parsed.error ?? 'Could not extract valid moves from response',
        content,
      )
    }

    const moves = parsed.moves.map((action) => ({ action }))
    logCallback?.('success', `Parsed ${moves.length} moves from response`)

    return {
      moves,
      comments: parsed.comments,
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

    const parsed = parseSingleMoveResponse(content)
    if (parsed.specialAction) {
      logCallback?.('success', `Detected special action: ${parsed.specialAction}`)
      return {
        action: 'UP', // Placeholder, won't be used
        specialAction: parsed.specialAction,
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
    const action = parsed.moves?.[0]
    if (!action) {
      throw new LLMParseError(parsed.error ?? 'Could not extract valid move from response', content)
    }

    logCallback?.('success', `Parsed move: ${action}`)

    return {
      action,
      comments: parsed.comments,
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
