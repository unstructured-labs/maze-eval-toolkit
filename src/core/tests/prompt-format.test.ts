/**
 * Tests for prompt format helpers
 */

import { describe, expect, test } from 'bun:test'
import { getEffectivePromptFormat } from '../prompt-format'

describe('getEffectivePromptFormat', () => {
  test('handles empty formats', () => {
    expect(getEffectivePromptFormat([])).toBeNull()
  })

  test('returns single format', () => {
    expect(getEffectivePromptFormat(['ascii'])).toBe('ascii')
  })

  test('normalizes combined formats', () => {
    expect(getEffectivePromptFormat(['ascii', 'edges'])).toBe('edges_ascii')
    expect(getEffectivePromptFormat(['edges', 'ascii'])).toBe('edges_ascii')
    expect(getEffectivePromptFormat(['ascii', 'block'])).toBe('ascii_block')
    expect(getEffectivePromptFormat(['block', 'ascii'])).toBe('ascii_block')
  })

  test('falls back to first format for unknown combos', () => {
    expect(getEffectivePromptFormat(['ascii', 'adjacency', 'edges'])).toBe('ascii')
  })
})
