/**
 * Common LLM utilities for OpenRouter API interactions
 */

import OpenAI from 'openai'

/**
 * Configuration for LLM API calls
 */
export interface LLMConfig {
  apiKey: string
  model: string
  baseURL?: string
}

/**
 * Statistics from an LLM response
 */
export interface LLMResponseStats {
  durationMs: number
  outputTokens: number
  cost: number
}

/**
 * Log levels for LLM callbacks
 */
export type LogLevel = 'request' | 'response' | 'success' | 'error'

/**
 * Callback for logging LLM interactions
 */
export type LogCallback = (level: LogLevel, message: string, details?: string) => void

/**
 * Custom error that includes the raw LLM response for debugging
 */
export class LLMParseError extends Error {
  rawResponse: string

  constructor(message: string, rawResponse: string) {
    super(message)
    this.name = 'LLMParseError'
    this.rawResponse = rawResponse
  }
}

/**
 * Get the OpenRouter API key from environment variable
 * @throws Error if API key is not set
 */
export function getApiKey(): string {
  const apiKey = import.meta.env?.VITE_OPENROUTER_API_KEY as string | undefined

  if (!apiKey) {
    throw new Error(
      'OpenRouter API key not found. Please set VITE_OPENROUTER_API_KEY in your .env file.',
    )
  }

  return apiKey
}

/**
 * Check if the OpenRouter API key is configured
 */
export function hasApiKey(): boolean {
  try {
    getApiKey()
    return true
  } catch {
    return false
  }
}

/**
 * Create an OpenAI client configured for OpenRouter
 */
export function createOpenRouterClient(apiKey?: string): OpenAI {
  const key = apiKey ?? getApiKey()

  return new OpenAI({
    apiKey: key,
    baseURL: 'https://openrouter.ai/api/v1',
    dangerouslyAllowBrowser: true,
  })
}
