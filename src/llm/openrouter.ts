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
  finishReason: string | null // 'stop' = natural, 'length' = hit token limit
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

  let completion: Record<string, unknown>
  try {
    completion = (await client.chat.completions.create({
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
    })) as unknown as Record<string, unknown>
  } catch (sdkError) {
    // SDK-level error (network, timeout, etc.)
    const errMsg = sdkError instanceof Error ? sdkError.message : String(sdkError)
    throw new Error(`API request failed: ${errMsg}`)
  }

  const inferenceTimeMs = Date.now() - startTime

  // Check for null/undefined response
  if (!completion) {
    throw new Error('Invalid API response: null or undefined response received')
  }

  // Check for OpenRouter error response
  if (completion.error) {
    const errorObj = completion.error as Record<string, unknown>
    const errorMsg = (errorObj.message as string) || JSON.stringify(completion.error)
    throw new Error(`OpenRouter API error: ${errorMsg}`)
  }

  // Validate response structure
  const choices = completion.choices as Array<Record<string, unknown>> | undefined
  if (!choices || choices.length === 0) {
    throw new Error(
      `Invalid API response: no choices returned. Response: ${JSON.stringify(completion).slice(0, 500)}`,
    )
  }

  const choice = choices[0]
  const message = choice?.message as Record<string, unknown> | undefined
  const content = (message?.content as string) ?? ''
  const finishReason = (choice?.finish_reason as string) ?? null

  // Extract reasoning from OpenRouter response
  const reasoning = (message?.reasoning as string) ?? null

  // Parse the response
  const parsed = parseResponse(content)

  // Extract stats
  const usage = completion.usage as Record<string, unknown> | undefined
  const stats: ResponseStats = {
    inputTokens: (usage?.prompt_tokens as number) ?? null,
    outputTokens: (usage?.completion_tokens as number) ?? null,
    reasoningTokens: extractReasoningTokens(usage),
    costUsd: extractCost(usage),
    inferenceTimeMs,
  }

  return {
    rawResponse: content,
    parsedMoves: parsed.moves,
    reasoning,
    parseError: parsed.error,
    finishReason,
    stats,
  }
}
