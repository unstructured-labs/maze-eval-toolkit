/**
 * Tests for maze solving and validation
 */

import { describe, expect, test } from 'bun:test'
import {
  applyMove,
  getValidMoves,
  solveMaze,
  validateSolution,
  validateSolutionWithConstraints,
} from '../maze-solver'
import type { Cell, MoveAction, RequiredMove } from '../types'

/**
 * Create a simple test maze grid
 *
 * Layout (3x3):
 * +--+--+--+
 * |P       |
 * +  +--+  +
 * |     |  |
 * +  +  +  +
 * |       G|
 * +--+--+--+
 *
 * P is at (0,0), G is at (2,2)
 * Two valid paths:
 * - RIGHT, RIGHT, DOWN, DOWN (top route)
 * - DOWN, DOWN, RIGHT, RIGHT (bottom route)
 */
function createSimpleMaze(): Cell[][] {
  return [
    [
      { x: 0, y: 0, walls: { top: true, right: false, bottom: false, left: true } },
      { x: 1, y: 0, walls: { top: true, right: false, bottom: true, left: false } },
      { x: 2, y: 0, walls: { top: true, right: true, bottom: false, left: false } },
    ],
    [
      { x: 0, y: 1, walls: { top: false, right: false, bottom: false, left: true } },
      { x: 1, y: 1, walls: { top: true, right: true, bottom: false, left: false } },
      { x: 2, y: 1, walls: { top: false, right: true, bottom: false, left: true } },
    ],
    [
      { x: 0, y: 2, walls: { top: false, right: false, bottom: true, left: true } },
      { x: 1, y: 2, walls: { top: false, right: false, bottom: true, left: false } },
      { x: 2, y: 2, walls: { top: false, right: true, bottom: true, left: false } },
    ],
  ]
}

describe('solveMaze', () => {
  test('finds shortest path in simple maze', () => {
    const grid = createSimpleMaze()
    const start = { x: 0, y: 0 }
    const goal = { x: 2, y: 2 }

    const stats = solveMaze(grid, start, goal)

    expect(stats.shortestPath).toBe(4) // RIGHT, RIGHT, DOWN, DOWN or equivalent
    expect(stats.totalReachable).toBeGreaterThan(0)
  })

  test('returns -1 for unreachable goal', () => {
    // Create a maze with an isolated cell
    const grid: Cell[][] = [
      [
        { x: 0, y: 0, walls: { top: true, right: true, bottom: true, left: true } },
        { x: 1, y: 0, walls: { top: true, right: true, bottom: false, left: true } },
      ],
      [
        { x: 0, y: 1, walls: { top: true, right: true, bottom: true, left: true } },
        { x: 1, y: 1, walls: { top: false, right: true, bottom: true, left: true } },
      ],
    ]
    const start = { x: 0, y: 0 }
    const goal = { x: 1, y: 1 }

    const stats = solveMaze(grid, start, goal)

    expect(stats.shortestPath).toBe(-1)
    expect(stats.wouldRegenerate).toBe(true)
  })

  test('handles start equals goal', () => {
    const grid = createSimpleMaze()
    const pos = { x: 1, y: 1 }

    const stats = solveMaze(grid, pos, pos)

    expect(stats.shortestPath).toBe(0)
  })

  test('respects obstacles', () => {
    const grid = createSimpleMaze()
    const start = { x: 0, y: 0 }
    const goal = { x: 2, y: 2 }
    // Block one path - (1,0) blocks top route, but bottom route still available
    const obstacles = [{ x: 1, y: 0 }]

    const stats = solveMaze(grid, start, goal, obstacles)

    // Bottom route is still available: DOWN, DOWN, RIGHT, RIGHT
    expect(stats.shortestPath).toBe(4)
  })
})

describe('getValidMoves', () => {
  test('returns correct moves from corner', () => {
    const grid = createSimpleMaze()
    const moves = getValidMoves(grid, { x: 0, y: 0 })

    expect(moves).toContain('RIGHT')
    expect(moves).toContain('DOWN')
    expect(moves).not.toContain('UP')
    expect(moves).not.toContain('LEFT')
  })

  test('respects walls', () => {
    const grid = createSimpleMaze()
    // Cell (1,1) has walls on right and top
    const moves = getValidMoves(grid, { x: 1, y: 1 })

    expect(moves).not.toContain('UP') // Wall above
    expect(moves).not.toContain('RIGHT') // Wall on right
    expect(moves).toContain('DOWN')
    expect(moves).toContain('LEFT')
  })
})

describe('applyMove', () => {
  test('applies UP correctly', () => {
    expect(applyMove({ x: 5, y: 5 }, 'UP')).toEqual({ x: 5, y: 4 })
  })

  test('applies DOWN correctly', () => {
    expect(applyMove({ x: 5, y: 5 }, 'DOWN')).toEqual({ x: 5, y: 6 })
  })

  test('applies LEFT correctly', () => {
    expect(applyMove({ x: 5, y: 5 }, 'LEFT')).toEqual({ x: 4, y: 5 })
  })

  test('applies RIGHT correctly', () => {
    expect(applyMove({ x: 5, y: 5 }, 'RIGHT')).toEqual({ x: 6, y: 5 })
  })
})

describe('validateSolution', () => {
  test('validates correct solution', () => {
    const grid = createSimpleMaze()
    const start = { x: 0, y: 0 }
    const goal = { x: 2, y: 2 }
    const moves: MoveAction[] = ['DOWN', 'DOWN', 'RIGHT', 'RIGHT']

    const result = validateSolution(grid, start, goal, 4, moves)

    expect(result.isValid).toBe(true)
    expect(result.reachesGoal).toBe(true)
    expect(result.efficiency).toBe(1.0)
    expect(result.pathLength).toBe(4)
  })

  test('detects invalid move (hitting wall)', () => {
    const grid = createSimpleMaze()
    const start = { x: 0, y: 0 }
    const goal = { x: 2, y: 2 }
    const moves: MoveAction[] = ['UP'] // Can't go up from start

    const result = validateSolution(grid, start, goal, 4, moves)

    expect(result.isValid).toBe(false)
    expect(result.errorAtMove).toBe(0)
    expect(result.errorMessage).toContain('Invalid move')
  })

  test('detects solution that does not reach goal', () => {
    const grid = createSimpleMaze()
    const start = { x: 0, y: 0 }
    const goal = { x: 2, y: 2 }
    const moves: MoveAction[] = ['RIGHT'] // Only one move, doesn't reach goal

    const result = validateSolution(grid, start, goal, 4, moves)

    expect(result.isValid).toBe(true) // All moves were valid
    expect(result.reachesGoal).toBe(false)
    expect(result.efficiency).toBeNull()
  })

  test('calculates efficiency correctly', () => {
    const grid = createSimpleMaze()
    const start = { x: 0, y: 0 }
    const goal = { x: 2, y: 2 }
    // Suboptimal path with backtracking (6 moves):
    // DOWN→(0,1), DOWN→(0,2), RIGHT→(1,2), UP→(1,1), DOWN→(1,2), RIGHT→(2,2)
    const moves: MoveAction[] = ['DOWN', 'DOWN', 'RIGHT', 'UP', 'DOWN', 'RIGHT']

    const result = validateSolution(grid, start, goal, 4, moves)

    expect(result.reachesGoal).toBe(true)
    expect(result.pathLength).toBe(6)
    expect(result.efficiency).toBeCloseTo(4 / 6, 5) // shortestPath / pathLength
  })

  test('caps efficiency at 1.0', () => {
    const grid = createSimpleMaze()
    const start = { x: 0, y: 0 }
    const goal = { x: 2, y: 2 }
    const moves: MoveAction[] = ['RIGHT', 'RIGHT', 'DOWN', 'DOWN']

    // Pretend shortest path is longer than actual solution (10 vs 4 moves)
    // Raw efficiency would be 10/4 = 2.5, but should be capped at 1.0
    const result = validateSolution(grid, start, goal, 10, moves)

    expect(result.efficiency).toBe(1.0)
  })
})

describe('validateSolutionWithConstraints', () => {
  test('validates solution with REQUIRED_TILES constraint', () => {
    const grid = createSimpleMaze()
    const start = { x: 0, y: 0 }
    const goal = { x: 2, y: 2 }
    // Path: DOWN→(0,1), DOWN→(0,2), RIGHT→(1,2), RIGHT→(2,2)
    const moves: MoveAction[] = ['DOWN', 'DOWN', 'RIGHT', 'RIGHT']
    const constraints = {
      requirementType: 'REQUIRED_TILES' as const,
      requiredTiles: [
        { x: 0, y: 1 }, // This tile is on the path
        { x: 0, y: 2 },
      ],
    }

    const result = validateSolutionWithConstraints(grid, start, goal, 4, moves, constraints)

    expect(result.isValid).toBe(true)
    expect(result.reachesGoal).toBe(true)
    expect(result.constraintsSatisfied).toBe(true)
  })

  test('fails when REQUIRED_TILES not visited', () => {
    const grid = createSimpleMaze()
    const start = { x: 0, y: 0 }
    const goal = { x: 2, y: 2 }
    const moves: MoveAction[] = ['RIGHT', 'RIGHT', 'DOWN', 'DOWN'] // Takes top route
    const constraints = {
      requirementType: 'REQUIRED_TILES' as const,
      requiredTiles: [
        { x: 0, y: 2 }, // This tile is NOT on the path
      ],
    }

    const result = validateSolutionWithConstraints(grid, start, goal, 4, moves, constraints)

    expect(result.constraintsSatisfied).toBe(false)
    expect(result.constraintError).toContain('required tile')
  })

  test('validates solution with REQUIRED_SUBSEQUENCE constraint', () => {
    const grid = createSimpleMaze()
    const start = { x: 0, y: 0 }
    const goal = { x: 2, y: 2 }
    // Path: DOWN→(0,1), DOWN→(0,2), RIGHT→(1,2), RIGHT→(2,2)
    const moves: MoveAction[] = ['DOWN', 'DOWN', 'RIGHT', 'RIGHT']

    // RequiredMove positions are DESTINATIONS after the move
    const requiredSubsequence: RequiredMove[] = [
      { move: 'DOWN', position: { x: 0, y: 1 } }, // First DOWN lands at (0,1)
      { move: 'RIGHT', position: { x: 1, y: 2 } }, // First RIGHT lands at (1,2)
    ]

    const constraints = {
      requirementType: 'REQUIRED_SUBSEQUENCE' as const,
      requiredSolutionSubsequences: [requiredSubsequence],
    }

    const result = validateSolutionWithConstraints(grid, start, goal, 4, moves, constraints)

    expect(result.constraintsSatisfied).toBe(true)
  })

  test('skips constraint checking with null requirementType', () => {
    const grid = createSimpleMaze()
    const start = { x: 0, y: 0 }
    const goal = { x: 2, y: 2 }
    const moves: MoveAction[] = ['RIGHT', 'RIGHT', 'DOWN', 'DOWN']
    const constraints = {
      requirementType: null,
    }

    const result = validateSolutionWithConstraints(grid, start, goal, 4, moves, constraints)

    // With null requirementType, constraint checking is skipped (returns early)
    // so constraintsSatisfied is not set
    expect(result.isValid).toBe(true)
    expect(result.reachesGoal).toBe(true)
    expect(result.constraintsSatisfied).toBeUndefined()
  })
})
