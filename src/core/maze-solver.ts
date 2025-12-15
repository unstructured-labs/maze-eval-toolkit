/**
 * Maze solving and validation using Breadth-First Search (BFS)
 */

import type { Cell, MazeStats, MoveAction, Position, SolutionValidation } from './types'
import { posToKey } from './types'

/**
 * Get valid neighbors from a position (respecting walls)
 */
function getNeighbors(grid: Cell[][], pos: Position, width: number, height: number): Position[] {
  const neighbors: Position[] = []
  const cell = grid[pos.y]?.[pos.x]
  if (!cell) return neighbors

  // Up
  if (!cell.walls.top && pos.y > 0) {
    neighbors.push({ x: pos.x, y: pos.y - 1 })
  }
  // Down
  if (!cell.walls.bottom && pos.y < height - 1) {
    neighbors.push({ x: pos.x, y: pos.y + 1 })
  }
  // Left
  if (!cell.walls.left && pos.x > 0) {
    neighbors.push({ x: pos.x - 1, y: pos.y })
  }
  // Right
  if (!cell.walls.right && pos.x < width - 1) {
    neighbors.push({ x: pos.x + 1, y: pos.y })
  }

  return neighbors
}

/**
 * Find the shortest path between start and goal using BFS
 *
 * @returns MazeStats with shortest path length (-1 if unreachable)
 */
export function solveMaze(grid: Cell[][], start: Position, goal: Position): MazeStats {
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

    for (const neighbor of getNeighbors(grid, pos, width, height)) {
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
    for (const neighbor of getNeighbors(grid, current.pos, width, height)) {
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
function applyMove(pos: Position, move: MoveAction): Position {
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
      return {
        isValid: true,
        reachesGoal: true,
        moves: moves.slice(0, i + 1),
        pathLength,
        efficiency: shortestPath / pathLength,
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
