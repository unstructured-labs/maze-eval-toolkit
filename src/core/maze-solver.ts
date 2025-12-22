/**
 * Maze solving and validation using Breadth-First Search (BFS)
 */

import { checkRequiredSubsequences, checkRequiredTiles } from './constraints'
import type {
  Cell,
  MazeStats,
  MoveAction,
  Position,
  RequiredMove,
  RequirementType,
  SolutionValidation,
} from './types'
import { posToKey } from './types'

/**
 * Check if a position is blocked by an obstacle
 */
export function isPositionBlocked(pos: Position, obstacles?: Position[]): boolean {
  if (!obstacles || obstacles.length === 0) return false
  return obstacles.some((o) => o.x === pos.x && o.y === pos.y)
}

/**
 * Constraint configuration for validation
 */
export interface MazeConstraints {
  requirementType: RequirementType
  requiredSolutionSubsequences?: RequiredMove[][] // Multiple paths (OR logic)
  requiredTiles?: Position[]
  shortestPathPlaythrough?: RequiredMove[]
}

/**
 * Get valid neighbors from a position (respecting walls and obstacles)
 */
function getNeighbors(
  grid: Cell[][],
  pos: Position,
  width: number,
  height: number,
  obstacles?: Position[],
): Position[] {
  const neighbors: Position[] = []
  const cell = grid[pos.y]?.[pos.x]
  if (!cell) return neighbors

  // Up
  if (!cell.walls.top && pos.y > 0) {
    const neighbor = { x: pos.x, y: pos.y - 1 }
    if (!isPositionBlocked(neighbor, obstacles)) {
      neighbors.push(neighbor)
    }
  }
  // Down
  if (!cell.walls.bottom && pos.y < height - 1) {
    const neighbor = { x: pos.x, y: pos.y + 1 }
    if (!isPositionBlocked(neighbor, obstacles)) {
      neighbors.push(neighbor)
    }
  }
  // Left
  if (!cell.walls.left && pos.x > 0) {
    const neighbor = { x: pos.x - 1, y: pos.y }
    if (!isPositionBlocked(neighbor, obstacles)) {
      neighbors.push(neighbor)
    }
  }
  // Right
  if (!cell.walls.right && pos.x < width - 1) {
    const neighbor = { x: pos.x + 1, y: pos.y }
    if (!isPositionBlocked(neighbor, obstacles)) {
      neighbors.push(neighbor)
    }
  }

  return neighbors
}

/**
 * Find the shortest path between start and goal using BFS
 *
 * @param grid - The maze grid
 * @param start - Starting position
 * @param goal - Goal position
 * @param obstacles - Optional list of blocked positions (e.g., holes)
 * @returns MazeStats with shortest path length (-1 if unreachable)
 */
export function solveMaze(
  grid: Cell[][],
  start: Position,
  goal: Position,
  obstacles?: Position[],
): MazeStats {
  const height = grid.length
  const width = grid[0]?.length ?? 0

  // BFS to find shortest path
  const visited = new Set<string>()
  const queue: { pos: Position; distance: number }[] = [{ pos: start, distance: 0 }]
  visited.add(posToKey(start))

  let shortestPath = -1

  while (queue.length > 0) {
    const current = queue.shift()!
    const { pos, distance } = current

    if (pos.x === goal.x && pos.y === goal.y) {
      shortestPath = distance
      break
    }

    for (const neighbor of getNeighbors(grid, pos, width, height, obstacles)) {
      const key = posToKey(neighbor)
      if (!visited.has(key)) {
        visited.add(key)
        queue.push({ pos: neighbor, distance: distance + 1 })
      }
    }
  }

  // Continue BFS to count all reachable cells
  while (queue.length > 0) {
    const current = queue.shift()!
    for (const neighbor of getNeighbors(grid, current.pos, width, height, obstacles)) {
      const key = posToKey(neighbor)
      if (!visited.has(key)) {
        visited.add(key)
        queue.push({ pos: neighbor, distance: current.distance + 1 })
      }
    }
  }

  const totalReachable = visited.size
  const ratio = totalReachable > 0 ? shortestPath / totalReachable : 0
  const wouldRegenerate = ratio < 0.15 || shortestPath <= 0

  return {
    shortestPath,
    totalReachable,
    ratio,
    wouldRegenerate,
  }
}

/**
 * Check if a move is valid from a given position
 */
function isValidMove(
  grid: Cell[][],
  pos: Position,
  move: MoveAction,
  width: number,
  height: number,
): boolean {
  const cell = grid[pos.y]?.[pos.x]
  if (!cell) return false

  switch (move) {
    case 'UP':
      return !cell.walls.top && pos.y > 0
    case 'DOWN':
      return !cell.walls.bottom && pos.y < height - 1
    case 'LEFT':
      return !cell.walls.left && pos.x > 0
    case 'RIGHT':
      return !cell.walls.right && pos.x < width - 1
    default:
      return false
  }
}

/**
 * Apply a move to a position
 */
export function applyMove(pos: Position, move: MoveAction): Position {
  switch (move) {
    case 'UP':
      return { x: pos.x, y: pos.y - 1 }
    case 'DOWN':
      return { x: pos.x, y: pos.y + 1 }
    case 'LEFT':
      return { x: pos.x - 1, y: pos.y }
    case 'RIGHT':
      return { x: pos.x + 1, y: pos.y }
  }
}

/**
 * Validate a solution (list of moves) against a maze
 */
export function validateSolution(
  grid: Cell[][],
  start: Position,
  goal: Position,
  shortestPath: number,
  moves: MoveAction[],
): SolutionValidation {
  const height = grid.length
  const width = grid[0]?.length ?? 0

  let currentPos = { ...start }

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i]!

    if (!isValidMove(grid, currentPos, move, width, height)) {
      return {
        isValid: false,
        reachesGoal: false,
        moves,
        pathLength: i,
        efficiency: null,
        finalPosition: currentPos,
        errorAtMove: i,
        errorMessage: `Invalid move ${move} at position (${currentPos.x}, ${currentPos.y})`,
      }
    }

    currentPos = applyMove(currentPos, move)

    // Check if we've reached the goal
    if (currentPos.x === goal.x && currentPos.y === goal.y) {
      const pathLength = i + 1
      // Cap efficiency at 1.0 (can exceed 1.0 for mazes with special instructions
      // where the solution path may be shorter than the calculated shortestPath)
      const rawEfficiency = shortestPath / pathLength
      return {
        isValid: true,
        reachesGoal: true,
        moves: moves.slice(0, i + 1),
        pathLength,
        efficiency: Math.min(rawEfficiency, 1.0),
        finalPosition: currentPos,
      }
    }
  }

  // Executed all moves but didn't reach goal
  return {
    isValid: true,
    reachesGoal: false,
    moves,
    pathLength: moves.length,
    efficiency: null,
    finalPosition: currentPos,
    errorMessage: `Did not reach goal. Final position: (${currentPos.x}, ${currentPos.y}), Goal: (${goal.x}, ${goal.y})`,
  }
}

/**
 * Get valid moves from a position
 */
export function getValidMoves(grid: Cell[][], pos: Position): MoveAction[] {
  const height = grid.length
  const width = grid[0]?.length ?? 0
  const validMoves: MoveAction[] = []

  if (isValidMove(grid, pos, 'UP', width, height)) validMoves.push('UP')
  if (isValidMove(grid, pos, 'DOWN', width, height)) validMoves.push('DOWN')
  if (isValidMove(grid, pos, 'LEFT', width, height)) validMoves.push('LEFT')
  if (isValidMove(grid, pos, 'RIGHT', width, height)) validMoves.push('RIGHT')

  return validMoves
}

/**
 * Validate solution with constraint checking
 */
export function validateSolutionWithConstraints(
  grid: Cell[][],
  start: Position,
  goal: Position,
  shortestPath: number,
  moves: MoveAction[],
  constraints?: MazeConstraints,
): SolutionValidation {
  // First, run the basic validation (existing logic)
  const baseValidation = validateSolution(grid, start, goal, shortestPath, moves)

  // If basic validation failed or no constraints, return as-is
  if (!baseValidation.isValid || !baseValidation.reachesGoal || !constraints?.requirementType) {
    return baseValidation
  }

  // Track visited positions and moves for constraint checking
  const visitedPositions: Position[] = [{ ...start }]
  const executedMoves: RequiredMove[] = []
  let currentPos = { ...start }

  // Re-execute moves to track positions (only for moves that were actually executed)
  for (const move of baseValidation.moves) {
    currentPos = applyMove(currentPos, move)
    visitedPositions.push({ ...currentPos })
    executedMoves.push({ move, position: { ...currentPos } })
  }

  // Check constraints based on type
  let constraintsSatisfied = true
  let constraintError: string | undefined

  if (constraints.requirementType === 'REQUIRED_SUBSEQUENCE') {
    const result = checkRequiredSubsequences(
      executedMoves,
      constraints.requiredSolutionSubsequences ?? [],
    )
    constraintsSatisfied = result.satisfied
    constraintError = result.error
  } else if (constraints.requirementType === 'REQUIRED_TILES') {
    const result = checkRequiredTiles(visitedPositions, constraints.requiredTiles ?? [])
    constraintsSatisfied = result.satisfied
    constraintError = result.error
  }

  return {
    ...baseValidation,
    constraintsSatisfied,
    constraintError,
  }
}
