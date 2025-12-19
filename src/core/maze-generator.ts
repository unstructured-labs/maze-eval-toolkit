/**
 * Maze generation using Depth-First Search (DFS)
 *
 * Simplified from apps/mazes - no rooms, hallways, obstacles, or special features.
 * Just pure DFS maze generation with optional extra paths.
 */

import { v4 as uuidv4 } from 'uuid'
import { getDifficultyConfig, randomDimension } from './difficulty'
import { solveMaze } from './maze-solver'
import type { Cell, Difficulty, GeneratedMaze, Position } from './types'

/**
 * Internal cell type used during generation (includes visited flag)
 */
interface GenerationCell extends Cell {
  visited: boolean
}

/**
 * Get unvisited neighbors for DFS
 */
function getUnvisitedNeighbors(
  grid: GenerationCell[][],
  cell: GenerationCell,
  width: number,
  height: number,
): GenerationCell[] {
  const neighbors: GenerationCell[] = []
  const { x, y } = cell

  // Top
  if (y > 0) {
    const neighbor = grid[y - 1]?.[x]
    if (neighbor && !neighbor.visited) {
      neighbors.push(neighbor)
    }
  }
  // Right
  if (x < width - 1) {
    const neighbor = grid[y]?.[x + 1]
    if (neighbor && !neighbor.visited) {
      neighbors.push(neighbor)
    }
  }
  // Bottom
  if (y < height - 1) {
    const neighbor = grid[y + 1]?.[x]
    if (neighbor && !neighbor.visited) {
      neighbors.push(neighbor)
    }
  }
  // Left
  if (x > 0) {
    const neighbor = grid[y]?.[x - 1]
    if (neighbor && !neighbor.visited) {
      neighbors.push(neighbor)
    }
  }

  return neighbors
}

/**
 * Remove the wall between two adjacent cells
 */
function removeWallBetween(current: GenerationCell, next: GenerationCell): void {
  const dx = next.x - current.x
  const dy = next.y - current.y

  if (dx === 1) {
    // Next is to the right
    current.walls.right = false
    next.walls.left = false
  } else if (dx === -1) {
    // Next is to the left
    current.walls.left = false
    next.walls.right = false
  } else if (dy === 1) {
    // Next is below
    current.walls.bottom = false
    next.walls.top = false
  } else if (dy === -1) {
    // Next is above
    current.walls.top = false
    next.walls.bottom = false
  }
}

/**
 * Generate a maze grid using iterative DFS
 */
function generateMazeGrid(width: number, height: number, extraPaths: number): GenerationCell[][] {
  // Initialize grid with all walls
  const grid: GenerationCell[][] = []
  for (let y = 0; y < height; y++) {
    grid[y] = []
    for (let x = 0; x < width; x++) {
      grid[y]![x] = {
        x,
        y,
        walls: { top: true, right: true, bottom: true, left: true },
        visited: false,
      }
    }
  }

  // Start DFS from (0, 0)
  const stack: GenerationCell[] = []
  const startCell = grid[0]![0]!
  startCell.visited = true
  stack.push(startCell)

  // Iterative DFS maze generation
  while (stack.length > 0) {
    const current = stack[stack.length - 1]!
    const neighbors = getUnvisitedNeighbors(grid, current, width, height)

    if (neighbors.length === 0) {
      // Backtrack
      stack.pop()
    } else {
      // Pick a random unvisited neighbor
      const next = neighbors[Math.floor(Math.random() * neighbors.length)]!
      removeWallBetween(current, next)
      next.visited = true
      stack.push(next)
    }
  }

  // Add extra paths (random wall removals) to make maze easier
  if (extraPaths > 0) {
    const numExtraPaths = Math.floor((width * height) / extraPaths)
    for (let i = 0; i < numExtraPaths; i++) {
      const x = Math.floor(Math.random() * (width - 1))
      const y = Math.floor(Math.random() * (height - 1))
      const direction = Math.random() < 0.5 ? 'right' : 'bottom'

      if (direction === 'right' && x < width - 1) {
        grid[y]![x]!.walls.right = false
        grid[y]![x + 1]!.walls.left = false
      } else if (direction === 'bottom' && y < height - 1) {
        grid[y]![x]!.walls.bottom = false
        grid[y + 1]![x]!.walls.top = false
      }
    }
  }

  return grid
}

/**
 * Place start and goal positions on the maze edges
 */
function placeStartAndGoal(width: number, height: number): { start: Position; goal: Position } {
  // Start in top-left quadrant
  const startX = Math.floor(Math.random() * Math.ceil(width / 3))
  const startY = Math.floor(Math.random() * Math.ceil(height / 3))

  // Goal in bottom-right quadrant
  const goalX = width - 1 - Math.floor(Math.random() * Math.ceil(width / 3))
  const goalY = height - 1 - Math.floor(Math.random() * Math.ceil(height / 3))

  return {
    start: { x: startX, y: startY },
    goal: { x: goalX, y: goalY },
  }
}

/**
 * Convert generation grid to output grid (remove visited flag)
 */
function toOutputGrid(grid: GenerationCell[][]): Cell[][] {
  return grid.map((row) =>
    row.map((cell) => ({
      x: cell.x,
      y: cell.y,
      walls: { ...cell.walls },
    })),
  )
}

/**
 * Generate a single maze for a given difficulty
 *
 * @param difficulty - The difficulty level
 * @param maxAttempts - Maximum attempts to meet minShortestPath requirement
 * @returns Generated maze or null if unable to meet requirements
 */
export function generateMaze(difficulty: Difficulty, maxAttempts = 2500): GeneratedMaze | null {
  const config = getDifficultyConfig(difficulty)

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Random dimensions within range
    const width = randomDimension(config.minWidth, config.maxWidth)
    const height = randomDimension(config.minHeight, config.maxHeight)

    // Generate maze grid
    const grid = generateMazeGrid(width, height, config.extraPaths)

    // Place start and goal
    const { start, goal } = placeStartAndGoal(width, height)

    // Convert to output format
    const outputGrid = toOutputGrid(grid)

    // Calculate shortest path
    const stats = solveMaze(outputGrid, start, goal)

    // Check if maze meets requirements
    if (stats.shortestPath >= config.minShortestPath && stats.shortestPath !== -1) {
      return {
        id: uuidv4(),
        difficulty,
        width,
        height,
        grid: outputGrid,
        start,
        goal,
        shortestPath: stats.shortestPath,
        generatedAt: new Date().toISOString(),
      }
    }
  }

  // Failed to generate a valid maze
  return null
}

/**
 * Generate multiple mazes for a difficulty level
 *
 * @param difficulty - The difficulty level
 * @param count - Number of mazes to generate
 * @param onProgress - Optional callback for progress updates
 * @returns Array of generated mazes
 */
export function generateMazes(
  difficulty: Difficulty,
  count: number,
  onProgress?: (current: number, total: number) => void,
): GeneratedMaze[] {
  const mazes: GeneratedMaze[] = []

  for (let i = 0; i < count; i++) {
    const maze = generateMaze(difficulty)
    if (maze) {
      mazes.push(maze)
    }
    onProgress?.(i + 1, count)
  }

  return mazes
}
