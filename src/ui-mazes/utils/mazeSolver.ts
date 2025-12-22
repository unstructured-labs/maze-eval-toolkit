/**
 * Maze solving utilities - wraps core solver with UI-specific hole support
 */

import { solveMaze as coreSolveMaze } from '@/core'
import { MIN_SHORTEST_PATH_FOR_REGENERATION } from '../constants'
import type { Cell, Hole, MazeStats, Position } from '../types'

/**
 * Convert holes (rectangular areas) to a list of individual obstacle positions
 */
function holesToObstacles(holes: Hole[]): Position[] {
  const obstacles: Position[] = []
  for (const hole of holes) {
    for (let y = hole.y; y < hole.y + hole.height; y++) {
      for (let x = hole.x; x < hole.x + hole.width; x++) {
        obstacles.push({ x, y })
      }
    }
  }
  return obstacles
}

/**
 * Solve a maze with support for holes (UI-specific feature).
 * Uses the core solver internally with holes converted to obstacles.
 *
 * @param grid - The maze grid
 * @param start - Starting position
 * @param goal - Goal position
 * @param holes - Rectangular hole areas that block movement
 * @returns MazeStats with shortest path info and regeneration recommendation
 */
export const solveMaze = (
  grid: Cell[][],
  start: Position,
  goal: Position,
  holes: Hole[] = [],
): MazeStats => {
  // Convert holes to obstacle positions for core solver
  const obstacles = holes.length > 0 ? holesToObstacles(holes) : undefined

  // Call core solver
  const result = coreSolveMaze(grid, start, goal, obstacles)

  // Apply UI-specific regeneration logic (core uses shortestPath <= 0, we use MIN_SHORTEST_PATH)
  return {
    ...result,
    wouldRegenerate:
      result.ratio < 0.15 || result.shortestPath <= MIN_SHORTEST_PATH_FOR_REGENERATION,
  }
}
