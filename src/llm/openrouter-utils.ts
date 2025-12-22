/**
 * Shared OpenRouter response helpers.
 */

/**
 * Extract cost from OpenRouter usage response.
 */
export function extractOpenRouterCost(usage: unknown): number | null {
  if (!usage || typeof usage !== 'object') return null

  const u = usage as Record<string, unknown>
  if (typeof u.cost === 'number') return u.cost
  if (typeof u.total_cost === 'number') return u.total_cost

  return null
}

/**
 * Extract reasoning tokens from OpenRouter response.
 */
export function extractOpenRouterReasoningTokens(usage: unknown): number | null {
  if (!usage || typeof usage !== 'object') return null

  const u = usage as Record<string, unknown>
  if (typeof u.reasoning_tokens === 'number') return u.reasoning_tokens
  if (u.completion_tokens_details && typeof u.completion_tokens_details === 'object') {
    const details = u.completion_tokens_details as Record<string, unknown>
    if (typeof details.reasoning_tokens === 'number') return details.reasoning_tokens
  }

  return null
}
