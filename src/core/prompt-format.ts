import type { PromptFormat } from './types'

/**
 * Determine the effective format from a promptFormats array.
 * Handles combined formats like ["ascii", "edges"] -> "edges_ascii".
 */
export function getEffectivePromptFormat(promptFormats: PromptFormat[]): PromptFormat | null {
  if (!promptFormats || promptFormats.length === 0) return null

  if (promptFormats.length === 2) {
    const hasEdges = promptFormats.includes('edges')
    const hasAscii = promptFormats.includes('ascii')
    const hasBlock = promptFormats.includes('block')

    if (hasEdges && hasAscii) {
      return 'edges_ascii'
    }
    if (hasAscii && hasBlock) {
      return 'ascii_block'
    }
  }

  return promptFormats[0] ?? null
}
