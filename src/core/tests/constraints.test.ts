/**
 * Tests for constraint utilities
 */

import { describe, expect, test } from 'bun:test'
import {
  checkRequiredSubsequence,
  checkRequiredSubsequences,
  checkRequiredTiles,
} from '../constraints'
import type { RequiredMove } from '../types'

describe('checkRequiredSubsequence', () => {
  test('matches subsequence in order', () => {
    const executed: RequiredMove[] = [
      { move: 'UP', position: { x: 0, y: 1 } },
      { move: 'RIGHT', position: { x: 1, y: 1 } },
      { move: 'DOWN', position: { x: 1, y: 2 } },
    ]
    const required: RequiredMove[] = [
      { move: 'UP', position: { x: 0, y: 1 } },
      { move: 'DOWN', position: { x: 1, y: 2 } },
    ]

    expect(checkRequiredSubsequence(executed, required).satisfied).toBe(true)
  })

  test('reports missing required move', () => {
    const executed: RequiredMove[] = [
      { move: 'UP', position: { x: 0, y: 1 } },
      { move: 'RIGHT', position: { x: 1, y: 1 } },
    ]
    const required: RequiredMove[] = [
      { move: 'UP', position: { x: 0, y: 1 } },
      { move: 'DOWN', position: { x: 1, y: 2 } },
    ]

    const result = checkRequiredSubsequence(executed, required)
    expect(result.satisfied).toBe(false)
    expect(result.error).toContain('Missing required move')
  })
})

describe('checkRequiredSubsequences', () => {
  test('matches one of multiple valid paths', () => {
    const executed: RequiredMove[] = [
      { move: 'LEFT', position: { x: 2, y: 0 } },
      { move: 'DOWN', position: { x: 2, y: 1 } },
      { move: 'RIGHT', position: { x: 3, y: 1 } },
    ]
    const requiredPaths: RequiredMove[][] = [
      [{ move: 'UP', position: { x: 0, y: 0 } }],
      [{ move: 'DOWN', position: { x: 2, y: 1 } }],
    ]

    const result = checkRequiredSubsequences(executed, requiredPaths)
    expect(result.satisfied).toBe(true)
    expect(result.matchedPathIndex).toBe(1)
  })
})

describe('checkRequiredTiles', () => {
  test('detects missing tiles', () => {
    const visited = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ]
    const required = [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ]

    const result = checkRequiredTiles(visited, required)
    expect(result.satisfied).toBe(false)
    expect(result.error).toContain('(2,0)')
  })
})
