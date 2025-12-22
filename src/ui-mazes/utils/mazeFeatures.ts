/**
 * Maze features: holes, portals, wildcard tiles
 */

import type { Cell, ExitDoorPair, Hole, Portal, Position } from '../types'
import { doBoxesOverlap } from './geometry'

/**
 * Generate holes (punched-out sections) in the maze.
 * Holes are rectangular areas that become voids - if a player walks off an edge
 * into a hole, they lose the game.
 */
export const generateHolesInMaze = (
  _grid: Cell[][],
  width: number,
  height: number,
  numHoles: number,
  startPos: Position,
  goalPos: Position,
): Hole[] => {
  const holes: Hole[] = []
  const maxAttempts = 50

  for (let i = 0; i < numHoles && holes.length < numHoles; i++) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Random hole dimensions (2-4 cells wide/tall)
      const holeWidth = Math.floor(Math.random() * 3) + 2
      const holeHeight = Math.floor(Math.random() * 3) + 2

      // Random position (avoid edges of maze for placement)
      const holeX = Math.floor(Math.random() * (width - holeWidth - 2)) + 1
      const holeY = Math.floor(Math.random() * (height - holeHeight - 2)) + 1

      const newHole: Hole = { x: holeX, y: holeY, width: holeWidth, height: holeHeight }

      // Check if hole overlaps with start or goal positions
      const overlapsStart =
        startPos.x >= holeX &&
        startPos.x < holeX + holeWidth &&
        startPos.y >= holeY &&
        startPos.y < holeY + holeHeight
      const overlapsGoal =
        goalPos.x >= holeX &&
        goalPos.x < holeX + holeWidth &&
        goalPos.y >= holeY &&
        goalPos.y < holeY + holeHeight

      if (overlapsStart || overlapsGoal) continue

      // Check if hole overlaps with existing holes (with buffer)
      const overlapsExisting = holes.some((existing) => doBoxesOverlap(newHole, existing, 1))
      if (overlapsExisting) continue

      // Valid hole found
      holes.push(newHole)
      break
    }
  }

  return holes
}

/**
 * Check if a position is inside any hole
 */
export const isPositionInHole = (pos: Position, holes: Hole[]): boolean => {
  return holes.some(
    (hole) =>
      pos.x >= hole.x &&
      pos.x < hole.x + hole.width &&
      pos.y >= hole.y &&
      pos.y < hole.y + hole.height,
  )
}

/**
 * Generate a random wildcard tile position.
 * The wildcard is placed on a random valid cell (not on start, goal, or holes).
 */
export const generateWildcardTile = (
  width: number,
  height: number,
  startPos: Position,
  goalPos: Position,
  holes: Hole[],
): Position | null => {
  const maxAttempts = 50

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const x = Math.floor(Math.random() * width)
    const y = Math.floor(Math.random() * height)

    // Skip if on start or goal
    if ((x === startPos.x && y === startPos.y) || (x === goalPos.x && y === goalPos.y)) {
      continue
    }

    // Skip if in a hole
    if (isPositionInHole({ x, y }, holes)) {
      continue
    }

    return { x, y }
  }

  return null
}

/**
 * Generate exit door portals on the maze boundary.
 * Creates two openings on different sides of the maze that connect to each other.
 */
export const generateExitDoorPair = (
  grid: Cell[][],
  width: number,
  height: number,
  startPos: Position,
  goalPos: Position,
): ExitDoorPair => {
  const sides: Array<'top' | 'bottom' | 'left' | 'right'> = ['top', 'bottom', 'left', 'right']

  // Randomly select two different sides
  const shuffledSides = [...sides].sort(() => Math.random() - 0.5)
  const side1 = shuffledSides[0]
  const side2 = shuffledSides[1]

  // Generate portal positions on each side, avoiding start/goal positions
  const getRandomPositionOnSide = (
    side: 'top' | 'bottom' | 'left' | 'right',
    avoid: Position[],
  ): Portal => {
    const maxAttempts = 20
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let x: number
      let y: number

      switch (side) {
        case 'top':
          x = Math.floor(Math.random() * width)
          y = 0
          break
        case 'bottom':
          x = Math.floor(Math.random() * width)
          y = height - 1
          break
        case 'left':
          x = 0
          y = Math.floor(Math.random() * height)
          break
        case 'right':
          x = width - 1
          y = Math.floor(Math.random() * height)
          break
      }

      // Check if this position conflicts with start or goal
      const conflicts = avoid.some((pos) => pos.x === x && pos.y === y)
      if (!conflicts) {
        return { x, y, side }
      }
    }

    // Fallback: just pick a random position
    let x: number
    let y: number
    switch (side) {
      case 'top':
        x = Math.floor(Math.random() * width)
        y = 0
        break
      case 'bottom':
        x = Math.floor(Math.random() * width)
        y = height - 1
        break
      case 'left':
        x = 0
        y = Math.floor(Math.random() * height)
        break
      case 'right':
        x = width - 1
        y = Math.floor(Math.random() * height)
        break
    }
    return { x, y, side }
  }

  const portal1 = getRandomPositionOnSide(side1, [startPos, goalPos])
  const portal2 = getRandomPositionOnSide(side2, [startPos, goalPos, portal1])

  // Open the maze boundary walls at portal locations
  const openPortalWall = (portal: Portal) => {
    const cell = grid[portal.y][portal.x]
    switch (portal.side) {
      case 'top':
        cell.walls.top = false
        break
      case 'bottom':
        cell.walls.bottom = false
        break
      case 'left':
        cell.walls.left = false
        break
      case 'right':
        cell.walls.right = false
        break
    }
  }

  openPortalWall(portal1)
  openPortalWall(portal2)

  return { portal1, portal2 }
}

/**
 * Check if a position is at a portal exit point (outside the maze boundary)
 * and return the destination portal if so
 */
export const checkPortalTeleport = (
  pos: Position,
  width: number,
  height: number,
  exitDoorPair: ExitDoorPair | null,
): Position | null => {
  if (!exitDoorPair) return null

  const { portal1, portal2 } = exitDoorPair

  // Check if player stepped outside through portal1
  if (
    (portal1.side === 'top' && pos.x === portal1.x && pos.y === -1) ||
    (portal1.side === 'bottom' && pos.x === portal1.x && pos.y === height) ||
    (portal1.side === 'left' && pos.x === -1 && pos.y === portal1.y) ||
    (portal1.side === 'right' && pos.x === width && pos.y === portal1.y)
  ) {
    // Teleport to portal2's cell
    return { x: portal2.x, y: portal2.y }
  }

  // Check if player stepped outside through portal2
  if (
    (portal2.side === 'top' && pos.x === portal2.x && pos.y === -1) ||
    (portal2.side === 'bottom' && pos.x === portal2.x && pos.y === height) ||
    (portal2.side === 'left' && pos.x === -1 && pos.y === portal2.y) ||
    (portal2.side === 'right' && pos.x === width && pos.y === portal2.y)
  ) {
    // Teleport to portal1's cell
    return { x: portal1.x, y: portal1.y }
  }

  return null
}
