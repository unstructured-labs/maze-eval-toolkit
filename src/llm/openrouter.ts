/**
 * OpenRouter API client for model evaluations
 */

import OpenAI from 'openai'
import type { MoveAction } from '../core/types'
import { parseResponse } from './parser'

/**
 * OpenRouter API response stats
 */
export interface ResponseStats {
  inputTokens: number | null
  outputTokens: number | null
  reasoningTokens: number | null
  costUsd: number | null
  inferenceTimeMs: number
}

/**
 * Result from evaluating a single maze
 */
export interface EvaluationResponse {
  rawResponse: string
  parsedMoves: MoveAction[] | null
  reasoning: string | null
  parseError?: string
  stats: ResponseStats
}

/**
 * Create an OpenRouter client
 */
export function createClient(apiKey: string): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
  })
}

/**
 * Extract cost from OpenRouter usage response
 */
function extractCost(usage: unknown): number | null {
  if (!usage || typeof usage !== 'object') return null

  // OpenRouter includes cost in usage.cost or usage.total_cost
  const u = usage as Record<string, unknown>
  if (typeof u.cost === 'number') return u.cost
  if (typeof u.total_cost === 'number') return u.total_cost

  return null
}

/**
 * Extract reasoning tokens from OpenRouter response
 */
function extractReasoningTokens(usage: unknown): number | null {
  if (!usage || typeof usage !== 'object') return null

  const u = usage as Record<string, unknown>
  // OpenRouter may include reasoning tokens in various fields
  if (typeof u.reasoning_tokens === 'number') return u.reasoning_tokens
  if (u.completion_tokens_details && typeof u.completion_tokens_details === 'object') {
    const details = u.completion_tokens_details as Record<string, unknown>
    if (typeof details.reasoning_tokens === 'number') return details.reasoning_tokens
  }

  return null
}

/**
 * Evaluate a maze prompt using OpenRouter
 */
export async function evaluateMaze(
  client: OpenAI,
  model: string,
  prompt: string,
): Promise<EvaluationResponse> {
  const startTime = Date.now()

  const completion = await client.chat.completions.create({
    model,
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

  const inferenceTimeMs = Date.now() - startTime

  const content = completion.choices[0]?.message?.content ?? ''

  // Extract reasoning from OpenRouter response
  // @ts-expect-error OpenRouter-specific reasoning field
  const reasoning = (completion.choices[0]?.message?.reasoning as string) ?? null

  // Parse the response
  const parsed = parseResponse(content)

  // Extract stats
  const usage = completion.usage
  const stats: ResponseStats = {
    inputTokens: usage?.prompt_tokens ?? null,
    outputTokens: usage?.completion_tokens ?? null,
    reasoningTokens: extractReasoningTokens(usage),
    costUsd: extractCost(usage),
    inferenceTimeMs,
  }

  return {
    rawResponse: content,
    parsedMoves: parsed.moves,
    reasoning,
    parseError: parsed.error,
    stats,
  }
}
