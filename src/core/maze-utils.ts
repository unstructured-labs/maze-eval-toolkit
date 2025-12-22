import type { Cell } from './types'

export interface VisitedCell extends Cell {
  visited: boolean
}

/**
 * Get unvisited neighbors for DFS.
 */
export function getUnvisitedNeighbors<T extends VisitedCell>(
  grid: T[][],
  cell: T,
  width: number,
  height: number,
): T[] {
  const neighbors: T[] = []
  const { x, y } = cell

  if (y > 0 && !grid[y - 1]?.[x]?.visited) neighbors.push(grid[y - 1]![x]!)
  if (x < width - 1 && !grid[y]?.[x + 1]?.visited) neighbors.push(grid[y]![x + 1]!)
  if (y < height - 1 && !grid[y + 1]?.[x]?.visited) neighbors.push(grid[y + 1]![x]!)
  if (x > 0 && !grid[y]?.[x - 1]?.visited) neighbors.push(grid[y]![x - 1]!)

  return neighbors
}

/**
 * Remove the wall between two adjacent cells.
 */
export function removeWallBetween(current: Cell, next: Cell): void {
  const dx = next.x - current.x
  const dy = next.y - current.y

  if (dx === 1) {
    current.walls.right = false
    next.walls.left = false
  } else if (dx === -1) {
    current.walls.left = false
    next.walls.right = false
  } else if (dy === 1) {
    current.walls.bottom = false
    next.walls.top = false
  } else if (dy === -1) {
    current.walls.top = false
    next.walls.bottom = false
  }
}
