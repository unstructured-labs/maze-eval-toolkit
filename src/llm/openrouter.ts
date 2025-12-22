/**
 * OpenRouter API client for model evaluations
 */

import OpenAI from 'openai'
import type { MoveAction, SpecialAction } from '../core/types'
import { extractOpenRouterCost, extractOpenRouterReasoningTokens } from './openrouter-utils'
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
  specialAction?: SpecialAction
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
    reasoningTokens: extractOpenRouterReasoningTokens(usage),
    costUsd: extractOpenRouterCost(usage),
    inferenceTimeMs,
  }

  return {
    rawResponse: content,
    parsedMoves: parsed.moves,
    reasoning,
    parseError: parsed.error,
    specialAction: parsed.specialAction,
    finishReason,
    stats,
  }
}
