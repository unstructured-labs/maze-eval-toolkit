/**
 * Maze generation utilities
 */

import type { Cell, Hallway, MutableCell, Obstacle, Position, Room } from '../types'
import { doBoxesOverlap, getHallwayBounds } from './geometry'

/** Punch an entrance through a wall, removing walls on both sides */
export const punchEntrance = (
  grid: Cell[][],
  entrance: { x: number; y: number; direction: 'top' | 'bottom' | 'left' | 'right' },
  width: number,
  height: number,
): void => {
  const cell = grid[entrance.y][entrance.x]
  switch (entrance.direction) {
    case 'top':
      cell.walls.top = false
      if (entrance.y > 0) grid[entrance.y - 1][entrance.x].walls.bottom = false
      break
    case 'bottom':
      cell.walls.bottom = false
      if (entrance.y < height - 1) grid[entrance.y + 1][entrance.x].walls.top = false
      break
    case 'left':
      cell.walls.left = false
      if (entrance.x > 0) grid[entrance.y][entrance.x - 1].walls.right = false
      break
    case 'right':
      cell.walls.right = false
      if (entrance.x < width - 1) grid[entrance.y][entrance.x + 1].walls.left = false
      break
  }
}

/** Remove wall between two adjacent cells */
export const removeWallBetween = (current: Cell, next: Cell): void => {
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

/** Get unvisited neighbors for DFS maze generation */
export const getUnvisitedNeighbors = (
  grid: MutableCell[][],
  cell: MutableCell,
  width: number,
  height: number,
): MutableCell[] => {
  const neighbors: MutableCell[] = []
  const { x, y } = cell

  if (y > 0 && !grid[y - 1][x].visited) neighbors.push(grid[y - 1][x])
  if (x < width - 1 && !grid[y][x + 1].visited) neighbors.push(grid[y][x + 1])
  if (y < height - 1 && !grid[y + 1][x].visited) neighbors.push(grid[y + 1][x])
  if (x > 0 && !grid[y][x - 1].visited) neighbors.push(grid[y][x - 1])

  return neighbors
}

/** Generate obstacles for a room */
export const generateObstacles = (room: Room): Obstacle[] => {
  const obstacles: Obstacle[] = []

  // Only add obstacles to rooms 3x3 or bigger
  if (room.width < 3 || room.height < 3) return obstacles

  // 80% chance to add obstacles
  if (Math.random() > 0.8) return obstacles

  const maxAttempts = 10

  // Try to place 1-4 obstacles based on room size
  const roomArea = room.width * room.height
  const maxObstacles = Math.min(4, Math.floor(roomArea / 6))
  const numObstacles = Math.floor(Math.random() * maxObstacles) + 1

  for (let i = 0; i < numObstacles; i++) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Obstacle sizes: 1x1, 1x2, 2x1, or 2x2
      const obstacleWidth = Math.random() < 0.6 ? 1 : 2
      const obstacleHeight = Math.random() < 0.6 ? 1 : 2

      // Place obstacle at least 1 cell away from room edges
      const maxX = room.x + room.width - obstacleWidth - 1
      const maxY = room.y + room.height - obstacleHeight - 1
      const minX = room.x + 1
      const minY = room.y + 1

      if (maxX < minX || maxY < minY) continue

      const ox = Math.floor(Math.random() * (maxX - minX + 1)) + minX
      const oy = Math.floor(Math.random() * (maxY - minY + 1)) + minY

      // Check for overlap with existing obstacles (with 1 cell buffer)
      const newObstacleBounds = { x: ox, y: oy, width: obstacleWidth, height: obstacleHeight }
      const overlaps = obstacles.some((o) => doBoxesOverlap(newObstacleBounds, o, 1))

      if (!overlaps) {
        obstacles.push({ x: ox, y: oy, width: obstacleWidth, height: obstacleHeight })
        break
      }
    }
  }

  return obstacles
}

/** Carve a room into the grid with optional obstacles */
export const carveRoom = (
  grid: MutableCell[][],
  room: Room,
  mazeWidth: number,
  mazeHeight: number,
): void => {
  // First, carve out the entire room
  for (let ry = room.y; ry < room.y + room.height; ry++) {
    for (let rx = room.x; rx < room.x + room.width; rx++) {
      const cell = grid[ry][rx]
      cell.visited = true

      // Remove internal walls within the room
      if (rx > room.x) cell.walls.left = false
      if (rx < room.x + room.width - 1) cell.walls.right = false
      if (ry > room.y) cell.walls.top = false
      if (ry < room.y + room.height - 1) cell.walls.bottom = false
    }
  }

  // Generate and place obstacles inside the room
  const obstacles = generateObstacles(room)
  for (const obstacle of obstacles) {
    for (let oy = obstacle.y; oy < obstacle.y + obstacle.height; oy++) {
      for (let ox = obstacle.x; ox < obstacle.x + obstacle.width; ox++) {
        const cell = grid[oy][ox]

        // Restore all walls for obstacle cells
        cell.walls.top = true
        cell.walls.right = true
        cell.walls.bottom = true
        cell.walls.left = true

        // Add walls on adjacent room cells facing the obstacle
        if (oy > 0 && oy - 1 >= room.y) {
          grid[oy - 1][ox].walls.bottom = true
        }
        if (oy < mazeHeight - 1 && oy + 1 < room.y + room.height) {
          grid[oy + 1][ox].walls.top = true
        }
        if (ox > 0 && ox - 1 >= room.x) {
          grid[oy][ox - 1].walls.right = true
        }
        if (ox < mazeWidth - 1 && ox + 1 < room.x + room.width) {
          grid[oy][ox + 1].walls.left = true
        }
      }
    }
  }
}

/** Carve a hallway into the grid, marking cells as visited and removing internal walls */
export const carveHallway = (grid: MutableCell[][], hallway: Hallway): void => {
  const bounds = getHallwayBounds(hallway)
  const isHorizontal = hallway.direction === 'horizontal'

  // Carve the main hallway shape
  for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
    for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
      const cell = grid[y][x]
      cell.visited = true

      // Remove internal walls within the hallway
      if (isHorizontal) {
        if (x > bounds.x) cell.walls.left = false
        if (x < bounds.x + bounds.width - 1) cell.walls.right = false
        if (hallway.width > 1) {
          if (y > bounds.y) cell.walls.top = false
          if (y < bounds.y + bounds.height - 1) cell.walls.bottom = false
        }
      } else {
        if (y > bounds.y) cell.walls.top = false
        if (y < bounds.y + bounds.height - 1) cell.walls.bottom = false
        if (hallway.width > 1) {
          if (x > bounds.x) cell.walls.left = false
          if (x < bounds.x + bounds.width - 1) cell.walls.right = false
        }
      }
    }
  }

  // Add wall intrusions for hallways wider than 1
  if (hallway.width < 2) return

  // More intrusions for wider hallways
  const numIntrusions = Math.floor(Math.random() * (2 + hallway.width)) + hallway.width
  const usedPositions = new Set<string>()

  for (let i = 0; i < numIntrusions; i++) {
    // Pick a random position along the length (not at the ends)
    const minPos = (isHorizontal ? hallway.x : hallway.y) + 2
    const maxPos = (isHorizontal ? hallway.x : hallway.y) + hallway.length - 3
    if (maxPos <= minPos) continue

    let pos: number
    let row: number // Which row/column within the hallway width
    let attempts = 0
    do {
      pos = Math.floor(Math.random() * (maxPos - minPos + 1)) + minPos
      row = Math.floor(Math.random() * (hallway.width - 1)) // 0 to width-2
      attempts++
    } while (usedPositions.has(`${pos},${row}`) && attempts < 20)

    if (usedPositions.has(`${pos},${row}`)) continue
    usedPositions.add(`${pos},${row}`)

    // Pick intrusion type
    const perpendicular = Math.random() < 0.5

    if (isHorizontal) {
      const ix = pos
      const iy = hallway.y + row

      if (perpendicular) {
        // Vertical wall segment (| shape) - blocks horizontal movement
        grid[iy][ix].walls.right = true
        grid[iy][ix + 1].walls.left = true
      } else {
        // Horizontal wall segment (— shape) - blocks vertical movement within hallway
        grid[iy][ix].walls.bottom = true
        grid[iy + 1][ix].walls.top = true
      }
    } else {
      const iy = pos
      const ix = hallway.x + row

      if (perpendicular) {
        // Horizontal wall segment (— shape) - blocks vertical movement
        grid[iy][ix].walls.bottom = true
        grid[iy + 1][ix].walls.top = true
      } else {
        // Vertical wall segment (| shape) - blocks horizontal movement within hallway
        grid[iy][ix].walls.right = true
        grid[iy][ix + 1].walls.left = true
      }
    }
  }
}

export const generateHallways = (
  mazeWidth: number,
  mazeHeight: number,
  numHallways: number,
): Hallway[] => {
  const hallways: Hallway[] = []
  const maxAttempts = 30

  for (let i = 0; i < numHallways; i++) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const direction = Math.random() < 0.5 ? 'horizontal' : 'vertical'
      const width = Math.random() < 0.8 ? 2 : 1

      let x: number
      let y: number
      let length: number

      if (direction === 'horizontal') {
        // Horizontal hallway spans 60-90% of maze width
        const minLength = Math.floor(mazeWidth * 0.6)
        const maxLength = Math.floor(mazeWidth * 0.9)
        length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength

        // Position: start near left edge, leave buffer
        x = Math.floor(Math.random() * Math.max(1, mazeWidth - length - 2)) + 1
        // Y position: somewhere in middle area, avoid edges
        const maxY = mazeHeight - width - 2
        y = Math.floor(Math.random() * Math.max(1, maxY - 2)) + 2
      } else {
        // Vertical hallway spans 60-90% of maze height
        const minLength = Math.floor(mazeHeight * 0.6)
        const maxLength = Math.floor(mazeHeight * 0.9)
        length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength

        // X position: somewhere in middle area, avoid edges
        const maxX = mazeWidth - width - 2
        x = Math.floor(Math.random() * Math.max(1, maxX - 2)) + 2
        // Position: start near top edge, leave buffer
        y = Math.floor(Math.random() * Math.max(1, mazeHeight - length - 2)) + 1
      }

      // Validate bounds
      if (direction === 'horizontal') {
        if (x < 1 || x + length >= mazeWidth - 1 || y < 2 || y + width >= mazeHeight - 1) {
          continue
        }
      } else {
        if (x < 2 || x + width >= mazeWidth - 1 || y < 1 || y + length >= mazeHeight - 1) {
          continue
        }
      }

      // Check for overlap with existing hallways (with buffer)
      const newHallwayBounds =
        direction === 'horizontal'
          ? { x, y, width: length, height: width }
          : { x, y, width, height: length }

      const overlaps = hallways.some((h) =>
        doBoxesOverlap(newHallwayBounds, getHallwayBounds(h), 1),
      )

      if (!overlaps) {
        hallways.push({ x, y, length, width, direction })
        break
      }
    }
  }

  return hallways
}

export const generateRooms = (
  mazeWidth: number,
  mazeHeight: number,
  numRooms: number,
  hallways: Hallway[] = [],
): Room[] => {
  const rooms: Room[] = []
  const maxAttempts = 50

  for (let i = 0; i < numRooms; i++) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Rooms can now be 3-6 cells to allow space for obstacles
      const roomWidth = Math.floor(Math.random() * 4) + 3
      const roomHeight = Math.floor(Math.random() * 4) + 3

      // Keep rooms away from edges (leave 2 cell buffer)
      const x = Math.floor(Math.random() * (mazeWidth - roomWidth - 3)) + 2
      const y = Math.floor(Math.random() * (mazeHeight - roomHeight - 3)) + 2

      if (x < 2 || y < 2 || x + roomWidth >= mazeWidth - 1 || y + roomHeight >= mazeHeight - 1) {
        continue
      }

      // Check for overlap with existing rooms (with 1 cell buffer)
      const newRoomBounds = { x, y, width: roomWidth, height: roomHeight }
      const overlapsRoom = rooms.some((r) => doBoxesOverlap(newRoomBounds, r, 1))

      // Check for overlap with hallways (with 1 cell buffer)
      const overlapsHallway = hallways.some((h) =>
        doBoxesOverlap(newRoomBounds, getHallwayBounds(h), 1),
      )

      if (!overlapsRoom && !overlapsHallway) {
        rooms.push({ x, y, width: roomWidth, height: roomHeight })
        break
      }
    }
  }

  return rooms
}

/**
 * Add scattered internal walls to break up large open spaces.
 * This helps make simple/easy mazes more interesting.
 */
export const addScatteredWalls = (
  grid: Cell[][],
  width: number,
  height: number,
  density: number,
): void => {
  const numWalls = Math.floor((width * height) / density)

  for (let i = 0; i < numWalls; i++) {
    // Pick a random interior cell (not on edges)
    const x = Math.floor(Math.random() * (width - 2)) + 1
    const y = Math.floor(Math.random() * (height - 2)) + 1

    const cell = grid[y][x]

    // Count how many walls this cell currently has
    const wallCount = [cell.walls.top, cell.walls.right, cell.walls.bottom, cell.walls.left].filter(
      Boolean,
    ).length

    // Only add walls to cells that are relatively open (2 or fewer walls)
    if (wallCount > 2) continue

    // Pick a random direction to add a wall
    const direction = Math.floor(Math.random() * 4)

    switch (direction) {
      case 0: // top
        if (!cell.walls.top && y > 0) {
          cell.walls.top = true
          grid[y - 1][x].walls.bottom = true
        }
        break
      case 1: // right
        if (!cell.walls.right && x < width - 1) {
          cell.walls.right = true
          grid[y][x + 1].walls.left = true
        }
        break
      case 2: // bottom
        if (!cell.walls.bottom && y < height - 1) {
          cell.walls.bottom = true
          grid[y + 1][x].walls.top = true
        }
        break
      case 3: // left
        if (!cell.walls.left && x > 0) {
          cell.walls.left = true
          grid[y][x - 1].walls.right = true
        }
        break
    }
  }
}

/** Generate an empty grid with all walls */
export const createEmptyGrid = (width: number, height: number): MutableCell[][] => {
  const grid: MutableCell[][] = []
  for (let y = 0; y < height; y++) {
    grid[y] = []
    for (let x = 0; x < width; x++) {
      grid[y][x] = {
        x,
        y,
        walls: { top: true, right: true, bottom: true, left: true },
        visited: false,
      }
    }
  }
  return grid
}

export const generateMaze = (
  width: number,
  height: number,
  extraPathsDivisor: number,
  skipFeatures = false,
): Cell[][] => {
  const grid = createEmptyGrid(width, height)

  // Randomly decide which features to include
  // 40% rooms only, 40% hallways only, 10% both, 10% neither
  // Skip features entirely for simple difficulty
  let includeRooms = false
  let includeHallways = false

  if (!skipFeatures) {
    const featureRoll = Math.random()
    if (featureRoll < 0.4) {
      includeRooms = true
      includeHallways = false
    } else if (featureRoll < 0.8) {
      includeRooms = false
      includeHallways = true
    } else if (featureRoll < 0.9) {
      includeRooms = true
      includeHallways = true
    }
  }

  // Generate hallways first (they act as "spines" for the maze)
  let hallways: Hallway[] = []
  if (includeHallways) {
    hallways = generateHallways(width, height, 1)
  }

  // Carve out hallways: mark cells as visited and remove internal walls
  for (const hallway of hallways) {
    carveHallway(grid, hallway)
  }

  // Generate rooms (avoiding hallways)
  let rooms: Room[] = []
  if (includeRooms) {
    const numRooms = Math.max(1, Math.floor((width * height) / 80))
    rooms = generateRooms(width, height, numRooms, hallways)
  }

  // Carve out rooms: mark cells as visited and remove internal walls
  for (const room of rooms) {
    carveRoom(grid, room, width, height)
  }

  // Start maze generation from a non-room cell
  const stack: MutableCell[] = []
  let startCell: MutableCell = grid[0][0]
  // Find a non-visited cell to start from if (0,0) is in a room
  if (startCell.visited) {
    outer: for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!grid[y][x].visited) {
          startCell = grid[y][x]
          break outer
        }
      }
    }
  }
  startCell.visited = true
  stack.push(startCell)

  // DFS maze generation
  while (stack.length > 0) {
    const current = stack[stack.length - 1]
    const neighbors = getUnvisitedNeighbors(grid, current, width, height)

    if (neighbors.length === 0) {
      stack.pop()
    } else {
      const next = neighbors[Math.floor(Math.random() * neighbors.length)]
      removeWallBetween(current, next)
      next.visited = true
      stack.push(next)
    }
  }

  // Punch entrances into each room (1-3 entrances per room)
  for (const room of rooms) {
    const numEntrances = Math.floor(Math.random() * 3) + 1
    const possibleEntrances: {
      x: number
      y: number
      direction: 'top' | 'bottom' | 'left' | 'right'
    }[] = []

    // Top edge entrances
    for (let rx = room.x; rx < room.x + room.width; rx++) {
      if (room.y > 0) {
        possibleEntrances.push({ x: rx, y: room.y, direction: 'top' })
      }
    }
    // Bottom edge entrances
    for (let rx = room.x; rx < room.x + room.width; rx++) {
      if (room.y + room.height < height) {
        possibleEntrances.push({ x: rx, y: room.y + room.height - 1, direction: 'bottom' })
      }
    }
    // Left edge entrances
    for (let ry = room.y; ry < room.y + room.height; ry++) {
      if (room.x > 0) {
        possibleEntrances.push({ x: room.x, y: ry, direction: 'left' })
      }
    }
    // Right edge entrances
    for (let ry = room.y; ry < room.y + room.height; ry++) {
      if (room.x + room.width < width) {
        possibleEntrances.push({ x: room.x + room.width - 1, y: ry, direction: 'right' })
      }
    }

    // Shuffle and pick entrances
    const shuffled = possibleEntrances.sort(() => Math.random() - 0.5)
    const selectedEntrances = shuffled.slice(0, numEntrances)

    for (const entrance of selectedEntrances) {
      punchEntrance(grid, entrance, width, height)
    }
  }

  // Punch entrances into each hallway (2-4 entrances per hallway along its length)
  for (const hallway of hallways) {
    const numEntrances = Math.floor(Math.random() * 3) + 2
    const possibleEntrances: {
      x: number
      y: number
      direction: 'top' | 'bottom' | 'left' | 'right'
    }[] = []

    if (hallway.direction === 'horizontal') {
      // Top and bottom edges of horizontal hallway
      for (let hx = hallway.x; hx < hallway.x + hallway.length; hx++) {
        if (hallway.y > 0) {
          possibleEntrances.push({ x: hx, y: hallway.y, direction: 'top' })
        }
        if (hallway.y + hallway.width < height) {
          possibleEntrances.push({ x: hx, y: hallway.y + hallway.width - 1, direction: 'bottom' })
        }
      }
      // Left and right ends
      if (hallway.x > 0) {
        for (let hy = hallway.y; hy < hallway.y + hallway.width; hy++) {
          possibleEntrances.push({ x: hallway.x, y: hy, direction: 'left' })
        }
      }
      if (hallway.x + hallway.length < width) {
        for (let hy = hallway.y; hy < hallway.y + hallway.width; hy++) {
          possibleEntrances.push({ x: hallway.x + hallway.length - 1, y: hy, direction: 'right' })
        }
      }
    } else {
      // Left and right edges of vertical hallway
      for (let hy = hallway.y; hy < hallway.y + hallway.length; hy++) {
        if (hallway.x > 0) {
          possibleEntrances.push({ x: hallway.x, y: hy, direction: 'left' })
        }
        if (hallway.x + hallway.width < width) {
          possibleEntrances.push({ x: hallway.x + hallway.width - 1, y: hy, direction: 'right' })
        }
      }
      // Top and bottom ends
      if (hallway.y > 0) {
        for (let hx = hallway.x; hx < hallway.x + hallway.width; hx++) {
          possibleEntrances.push({ x: hx, y: hallway.y, direction: 'top' })
        }
      }
      if (hallway.y + hallway.length < height) {
        for (let hx = hallway.x; hx < hallway.x + hallway.width; hx++) {
          possibleEntrances.push({ x: hx, y: hallway.y + hallway.length - 1, direction: 'bottom' })
        }
      }
    }

    // Shuffle and pick entrances
    const shuffled = possibleEntrances.sort(() => Math.random() - 0.5)
    const selectedEntrances = shuffled.slice(0, numEntrances)

    for (const entrance of selectedEntrances) {
      punchEntrance(grid, entrance, width, height)
    }
  }

  if (extraPathsDivisor > 0) {
    const extraPaths = Math.floor((width * height) / extraPathsDivisor)
    for (let i = 0; i < extraPaths; i++) {
      const x = Math.floor(Math.random() * (width - 1))
      const y = Math.floor(Math.random() * (height - 1))
      const direction = Math.random() < 0.5 ? 'right' : 'bottom'

      if (direction === 'right' && x < width - 1) {
        grid[y][x].walls.right = false
        grid[y][x + 1].walls.left = false
      } else if (direction === 'bottom' && y < height - 1) {
        grid[y][x].walls.bottom = false
        grid[y + 1][x].walls.top = false
      }
    }
  }

  // Add scattered walls to break up open spaces (skip for simple mazes - they're pure DFS)
  if (!skipFeatures) {
    addScatteredWalls(grid, width, height, 8)
  }

  return grid
}

/**
 * Generate a "hack mode" maze with an obvious straight path from start to goal.
 * Creates a long hallway spanning the maze, then generates maze around it.
 * Returns the maze grid along with the start and goal positions.
 */
export const generateHackMaze = (
  width: number,
  height: number,
  extraPathsDivisor: number,
): { grid: Cell[][]; start: Position; goal: Position } => {
  const grid = createEmptyGrid(width, height)

  // Decide hallway direction and dimensions
  const isHorizontal = Math.random() < 0.5
  const hallwayWidth = Math.floor(Math.random() * 3) + 1 // 1-3 cells wide

  let hallway: Hallway
  let start: Position
  let goal: Position

  if (isHorizontal) {
    // Horizontal hallway spanning 60-90% of the width
    const lengthRatio = 0.6 + Math.random() * 0.3
    const hallwayLength = Math.max(5, Math.floor(width * lengthRatio))

    // Random Y position (not always centered), keep away from edges
    const maxY = height - hallwayWidth - 1
    const hallwayY = Math.floor(Math.random() * Math.max(1, maxY - 1)) + 1

    // Random X start position
    const maxStartX = width - hallwayLength
    const hallwayX = Math.floor(Math.random() * (maxStartX + 1))

    hallway = {
      x: hallwayX,
      y: hallwayY,
      length: hallwayLength,
      width: hallwayWidth,
      direction: 'horizontal',
    }

    // Player and goal at opposite ends, slightly inset from hallway ends
    const insetStart = Math.floor(Math.random() * Math.min(2, hallwayLength / 4))
    const insetEnd = Math.floor(Math.random() * Math.min(2, hallwayLength / 4))
    const hallwayMidY = hallwayY + Math.floor(hallwayWidth / 2)

    start = { x: hallwayX + insetStart, y: hallwayMidY }
    goal = { x: hallwayX + hallwayLength - 1 - insetEnd, y: hallwayMidY }
  } else {
    // Vertical hallway spanning 60-90% of the height
    const lengthRatio = 0.6 + Math.random() * 0.3
    const hallwayLength = Math.max(5, Math.floor(height * lengthRatio))

    // Random X position (not always centered), keep away from edges
    const maxX = width - hallwayWidth - 1
    const hallwayX = Math.floor(Math.random() * Math.max(1, maxX - 1)) + 1

    // Random Y start position
    const maxStartY = height - hallwayLength
    const hallwayY = Math.floor(Math.random() * (maxStartY + 1))

    hallway = {
      x: hallwayX,
      y: hallwayY,
      length: hallwayLength,
      width: hallwayWidth,
      direction: 'vertical',
    }

    // Player and goal at opposite ends, slightly inset from hallway ends
    const insetStart = Math.floor(Math.random() * Math.min(2, hallwayLength / 4))
    const insetEnd = Math.floor(Math.random() * Math.min(2, hallwayLength / 4))
    const hallwayMidX = hallwayX + Math.floor(hallwayWidth / 2)

    start = { x: hallwayMidX, y: hallwayY + insetStart }
    goal = { x: hallwayMidX, y: hallwayY + hallwayLength - 1 - insetEnd }
  }

  // Carve the main hallway
  carveHallway(grid, hallway)

  // Run DFS maze generation on all unvisited cells
  const runDFS = (startCell: MutableCell) => {
    const stack: MutableCell[] = []
    startCell.visited = true
    stack.push(startCell)

    while (stack.length > 0) {
      const current = stack[stack.length - 1]
      const neighbors = getUnvisitedNeighbors(grid, current, width, height)

      if (neighbors.length === 0) {
        stack.pop()
      } else {
        const next = neighbors[Math.floor(Math.random() * neighbors.length)]
        removeWallBetween(current, next)
        next.visited = true
        stack.push(next)
      }
    }
  }

  // Keep running DFS until all cells are visited
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!grid[y][x].visited) {
        runDFS(grid[y][x])
      }
    }
  }

  // Punch entrances into the hallway (4-8 entrances)
  const numEntrances = Math.floor(Math.random() * 5) + 4
  const possibleEntrances: {
    x: number
    y: number
    direction: 'top' | 'bottom' | 'left' | 'right'
  }[] = []

  const bounds = getHallwayBounds(hallway)

  if (isHorizontal) {
    // Top and bottom edges of horizontal hallway
    for (let hx = 1; hx < bounds.x + bounds.width - 1; hx++) {
      if (bounds.y > 0) {
        possibleEntrances.push({ x: hx, y: bounds.y, direction: 'top' })
      }
      if (bounds.y + bounds.height < height) {
        possibleEntrances.push({ x: hx, y: bounds.y + bounds.height - 1, direction: 'bottom' })
      }
    }
  } else {
    // Left and right edges of vertical hallway
    for (let hy = 1; hy < bounds.y + bounds.height - 1; hy++) {
      if (bounds.x > 0) {
        possibleEntrances.push({ x: bounds.x, y: hy, direction: 'left' })
      }
      if (bounds.x + bounds.width < width) {
        possibleEntrances.push({ x: bounds.x + bounds.width - 1, y: hy, direction: 'right' })
      }
    }
  }

  // Shuffle and pick entrances
  const shuffled = possibleEntrances.sort(() => Math.random() - 0.5)
  const selectedEntrances = shuffled.slice(0, Math.min(numEntrances, shuffled.length))

  for (const entrance of selectedEntrances) {
    punchEntrance(grid, entrance, width, height)
  }

  // Add extra paths for easier navigation
  if (extraPathsDivisor > 0) {
    const extraPaths = Math.floor((width * height) / extraPathsDivisor)
    for (let i = 0; i < extraPaths; i++) {
      const x = Math.floor(Math.random() * (width - 1))
      const y = Math.floor(Math.random() * (height - 1))
      const direction = Math.random() < 0.5 ? 'right' : 'bottom'

      if (direction === 'right' && x < width - 1) {
        grid[y][x].walls.right = false
        grid[y][x + 1].walls.left = false
      } else if (direction === 'bottom' && y < height - 1) {
        grid[y][x].walls.bottom = false
        grid[y + 1][x].walls.top = false
      }
    }
  }

  return { grid, start, goal }
}

export const getRandomEdgePosition = (
  width: number,
  height: number,
  excludePosition?: Position,
): Position => {
  const edges: Position[] = []

  // Define corners to exclude for variety
  const corners = new Set([
    '0,0',
    `${width - 1},0`,
    `0,${height - 1}`,
    `${width - 1},${height - 1}`,
  ])

  // 80% chance to avoid corners for more variety
  const avoidCorners = Math.random() < 0.8

  for (let x = 0; x < width; x++) {
    if (!avoidCorners || !corners.has(`${x},0`)) {
      edges.push({ x, y: 0 })
    }
    if (!avoidCorners || !corners.has(`${x},${height - 1}`)) {
      edges.push({ x, y: height - 1 })
    }
  }
  for (let y = 1; y < height - 1; y++) {
    edges.push({ x: 0, y })
    edges.push({ x: width - 1, y })
  }

  if (excludePosition) {
    const filtered = edges.filter(
      (pos) =>
        Math.abs(pos.x - excludePosition.x) + Math.abs(pos.y - excludePosition.y) >
        Math.min(width, height) / 2,
    )
    if (filtered.length > 0) {
      return filtered[Math.floor(Math.random() * filtered.length)]
    }
  }

  return edges[Math.floor(Math.random() * edges.length)]
}

/**
 * Generate a "hack maze 2" with an L-shaped corridor.
 * Start is at one end, goal at the other (possibly in a small alcove).
 */
export const generateHackMaze2 = (
  width: number,
  height: number,
  extraPathsDivisor: number,
): { grid: Cell[][]; start: Position; goal: Position } => {
  const grid = createEmptyGrid(width, height)

  // Choose which two edges to form the L-shape
  // Options: bottom-right, bottom-left, top-right, top-left
  const cornerType = Math.floor(Math.random() * 4) as 0 | 1 | 2 | 3
  const hallwayWidth = Math.floor(Math.random() * 2) + 1 // 1-2 cells wide

  // Track all hallway cells for later entrance punching
  const hallwayCells = new Set<string>()

  let start: Position
  let goal: Position

  // Helper to carve a straight hallway segment
  const carveSegment = (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    segmentWidth: number,
    isHorizontal: boolean,
  ) => {
    if (isHorizontal) {
      const minX = Math.min(startX, endX)
      const maxX = Math.max(startX, endX)
      for (let x = minX; x <= maxX; x++) {
        for (let w = 0; w < segmentWidth; w++) {
          const y = startY + w
          if (y >= 0 && y < height && x >= 0 && x < width) {
            const cell = grid[y][x]
            cell.visited = true
            hallwayCells.add(`${x},${y}`)

            // Remove internal walls
            if (x > minX) cell.walls.left = false
            if (x < maxX) cell.walls.right = false
            if (w > 0) cell.walls.top = false
            if (w < segmentWidth - 1) cell.walls.bottom = false
          }
        }
      }
    } else {
      const minY = Math.min(startY, endY)
      const maxY = Math.max(startY, endY)
      for (let y = minY; y <= maxY; y++) {
        for (let w = 0; w < segmentWidth; w++) {
          const x = startX + w
          if (y >= 0 && y < height && x >= 0 && x < width) {
            const cell = grid[y][x]
            cell.visited = true
            hallwayCells.add(`${x},${y}`)

            // Remove internal walls
            if (y > minY) cell.walls.top = false
            if (y < maxY) cell.walls.bottom = false
            if (w > 0) cell.walls.left = false
            if (w < segmentWidth - 1) cell.walls.right = false
          }
        }
      }
    }
  }

  // Add wall intrusions to a hallway segment for visual complexity
  const addIntrusions = (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    segmentWidth: number,
    isHorizontal: boolean,
  ) => {
    if (segmentWidth < 2) return // Only add intrusions to wider hallways

    const length = isHorizontal ? Math.abs(endX - startX) + 1 : Math.abs(endY - startY) + 1

    const numIntrusions = Math.floor(Math.random() * (2 + segmentWidth)) + segmentWidth
    const usedPositions = new Set<string>()

    for (let i = 0; i < numIntrusions; i++) {
      // Pick a random position along the length (not at the ends)
      const minPos = 2
      const maxPos = length - 3
      if (maxPos <= minPos) continue

      let pos: number
      let row: number
      let attempts = 0
      do {
        pos = Math.floor(Math.random() * (maxPos - minPos + 1)) + minPos
        row = Math.floor(Math.random() * (segmentWidth - 1))
        attempts++
      } while (usedPositions.has(`${pos},${row}`) && attempts < 20)

      if (usedPositions.has(`${pos},${row}`)) continue
      usedPositions.add(`${pos},${row}`)

      const perpendicular = Math.random() < 0.5

      if (isHorizontal) {
        const ix = Math.min(startX, endX) + pos
        const iy = startY + row

        if (ix >= 0 && ix < width - 1 && iy >= 0 && iy < height - 1) {
          if (perpendicular) {
            // Vertical wall segment - blocks horizontal movement
            grid[iy][ix].walls.right = true
            grid[iy][ix + 1].walls.left = true
          } else {
            // Horizontal wall segment - blocks vertical movement
            grid[iy][ix].walls.bottom = true
            grid[iy + 1][ix].walls.top = true
          }
        }
      } else {
        const iy = Math.min(startY, endY) + pos
        const ix = startX + row

        if (ix >= 0 && ix < width - 1 && iy >= 0 && iy < height - 1) {
          if (perpendicular) {
            // Horizontal wall segment - blocks vertical movement
            grid[iy][ix].walls.bottom = true
            grid[iy + 1][ix].walls.top = true
          } else {
            // Vertical wall segment - blocks horizontal movement
            grid[iy][ix].walls.right = true
            grid[iy][ix + 1].walls.left = true
          }
        }
      }
    }
  }

  // Connect corner cells (remove walls between the two segments at the corner)
  const connectCorner = (
    cornerX: number,
    cornerY: number,
    segmentWidth: number,
    corner: number,
  ) => {
    for (let w = 0; w < segmentWidth; w++) {
      for (let w2 = 0; w2 < segmentWidth; w2++) {
        let x1: number
        let y1: number
        let x2: number
        let y2: number

        switch (corner) {
          case 0: // bottom-right
            x1 = cornerX - w
            y1 = cornerY - w2
            x2 = cornerX - w2
            y2 = cornerY - w
            break
          case 1: // bottom-left
            x1 = cornerX + w
            y1 = cornerY - w2
            x2 = cornerX + w2
            y2 = cornerY - w
            break
          case 2: // top-right
            x1 = cornerX - w
            y1 = cornerY + w2
            x2 = cornerX - w2
            y2 = cornerY + w
            break
          case 3: // top-left
            x1 = cornerX + w
            y1 = cornerY + w2
            x2 = cornerX + w2
            y2 = cornerY + w
            break
          default:
            return
        }

        // Remove walls between adjacent corner cells
        if (
          x1 >= 0 &&
          x1 < width &&
          y1 >= 0 &&
          y1 < height &&
          x2 >= 0 &&
          x2 < width &&
          y2 >= 0 &&
          y2 < height
        ) {
          const cell1 = grid[y1][x1]
          const cell2 = grid[y2][x2]

          // If they're adjacent, remove walls between them
          if (Math.abs(x1 - x2) + Math.abs(y1 - y2) === 1) {
            removeWallBetween(cell1, cell2)
          }
        }
      }
    }
  }

  switch (cornerType) {
    case 0: {
      // Bottom edge, then up right edge
      carveSegment(0, height - hallwayWidth, width - 1, height - hallwayWidth, hallwayWidth, true)
      carveSegment(width - hallwayWidth, 0, width - hallwayWidth, height - 1, hallwayWidth, false)
      connectCorner(width - 1, height - 1, hallwayWidth, 0)
      addIntrusions(0, height - hallwayWidth, width - 1, height - hallwayWidth, hallwayWidth, true)
      addIntrusions(width - hallwayWidth, 0, width - hallwayWidth, height - 1, hallwayWidth, false)

      start = { x: 0, y: height - Math.ceil(hallwayWidth / 2) }
      // Goal at top of right edge, possibly in alcove
      const alcoveDepth = Math.random() < 0.5 ? Math.floor(Math.random() * 2) + 1 : 0
      goal = {
        x: width - Math.ceil(hallwayWidth / 2) - alcoveDepth,
        y: 0,
      }
      break
    }
    case 1: {
      // Bottom edge, then up left edge
      carveSegment(0, height - hallwayWidth, width - 1, height - hallwayWidth, hallwayWidth, true)
      carveSegment(0, 0, 0, height - 1, hallwayWidth, false)
      connectCorner(0, height - 1, hallwayWidth, 1)
      addIntrusions(0, height - hallwayWidth, width - 1, height - hallwayWidth, hallwayWidth, true)
      addIntrusions(0, 0, 0, height - 1, hallwayWidth, false)

      start = { x: width - 1, y: height - Math.ceil(hallwayWidth / 2) }
      const alcoveDepth = Math.random() < 0.5 ? Math.floor(Math.random() * 2) + 1 : 0
      goal = {
        x: Math.ceil(hallwayWidth / 2) - 1 + alcoveDepth,
        y: 0,
      }
      break
    }
    case 2: {
      // Top edge, then down right edge
      carveSegment(0, 0, width - 1, 0, hallwayWidth, true)
      carveSegment(width - hallwayWidth, 0, width - hallwayWidth, height - 1, hallwayWidth, false)
      connectCorner(width - 1, 0, hallwayWidth, 2)
      addIntrusions(0, 0, width - 1, 0, hallwayWidth, true)
      addIntrusions(width - hallwayWidth, 0, width - hallwayWidth, height - 1, hallwayWidth, false)

      start = { x: 0, y: Math.ceil(hallwayWidth / 2) - 1 }
      const alcoveDepth = Math.random() < 0.5 ? Math.floor(Math.random() * 2) + 1 : 0
      goal = {
        x: width - Math.ceil(hallwayWidth / 2) - alcoveDepth,
        y: height - 1,
      }
      break
    }
    case 3: {
      // Top edge, then down left edge
      carveSegment(0, 0, width - 1, 0, hallwayWidth, true)
      carveSegment(0, 0, 0, height - 1, hallwayWidth, false)
      connectCorner(0, 0, hallwayWidth, 3)
      addIntrusions(0, 0, width - 1, 0, hallwayWidth, true)
      addIntrusions(0, 0, 0, height - 1, hallwayWidth, false)

      start = { x: width - 1, y: Math.ceil(hallwayWidth / 2) - 1 }
      const alcoveDepth = Math.random() < 0.5 ? Math.floor(Math.random() * 2) + 1 : 0
      goal = {
        x: Math.ceil(hallwayWidth / 2) - 1 + alcoveDepth,
        y: height - 1,
      }
      break
    }
  }

  // Ensure goal is within bounds
  goal = {
    x: Math.max(0, Math.min(width - 1, goal.x)),
    y: Math.max(0, Math.min(height - 1, goal.y)),
  }

  // If goal is in an alcove, carve a path to it from the hallway
  if (!hallwayCells.has(`${goal.x},${goal.y}`)) {
    // Find nearest hallway cell and carve path
    const goalCell = grid[goal.y][goal.x]
    goalCell.visited = true

    // Find adjacent hallway cell and connect
    const directions = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
    ]
    for (const { dx, dy } of directions) {
      const nx = goal.x + dx
      const ny = goal.y + dy
      if (hallwayCells.has(`${nx},${ny}`)) {
        removeWallBetween(goalCell, grid[ny][nx])
        break
      }
    }
  }

  // Run DFS maze generation on all unvisited cells
  const runDFS = (startCell: MutableCell) => {
    const stack: MutableCell[] = []
    startCell.visited = true
    stack.push(startCell)

    while (stack.length > 0) {
      const current = stack[stack.length - 1]
      const neighbors = getUnvisitedNeighbors(grid, current, width, height)

      if (neighbors.length === 0) {
        stack.pop()
      } else {
        const next = neighbors[Math.floor(Math.random() * neighbors.length)]
        removeWallBetween(current, next)
        next.visited = true
        stack.push(next)
      }
    }
  }

  // Keep running DFS until all cells are visited
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!grid[y][x].visited) {
        runDFS(grid[y][x])
      }
    }
  }

  // Punch entrances into the L-shaped hallway (6-10 entrances)
  const numEntrances = Math.floor(Math.random() * 5) + 6
  const possibleEntrances: {
    x: number
    y: number
    direction: 'top' | 'bottom' | 'left' | 'right'
  }[] = []

  // Find all hallway cells that border non-hallway cells
  for (const key of hallwayCells) {
    const [xStr, yStr] = key.split(',')
    const x = Number.parseInt(xStr, 10)
    const y = Number.parseInt(yStr, 10)

    // Check each direction
    if (y > 0 && !hallwayCells.has(`${x},${y - 1}`)) {
      possibleEntrances.push({ x, y, direction: 'top' })
    }
    if (y < height - 1 && !hallwayCells.has(`${x},${y + 1}`)) {
      possibleEntrances.push({ x, y, direction: 'bottom' })
    }
    if (x > 0 && !hallwayCells.has(`${x - 1},${y}`)) {
      possibleEntrances.push({ x, y, direction: 'left' })
    }
    if (x < width - 1 && !hallwayCells.has(`${x + 1},${y}`)) {
      possibleEntrances.push({ x, y, direction: 'right' })
    }
  }

  // Shuffle and pick entrances
  const shuffled = possibleEntrances.sort(() => Math.random() - 0.5)
  const selectedEntrances = shuffled.slice(0, Math.min(numEntrances, shuffled.length))

  for (const entrance of selectedEntrances) {
    punchEntrance(grid, entrance, width, height)
  }

  // Add extra paths for easier navigation
  if (extraPathsDivisor > 0) {
    const extraPaths = Math.floor((width * height) / extraPathsDivisor)
    for (let i = 0; i < extraPaths; i++) {
      const x = Math.floor(Math.random() * (width - 1))
      const y = Math.floor(Math.random() * (height - 1))
      const direction = Math.random() < 0.5 ? 'right' : 'bottom'

      if (direction === 'right' && x < width - 1) {
        grid[y][x].walls.right = false
        grid[y][x + 1].walls.left = false
      } else if (direction === 'bottom' && y < height - 1) {
        grid[y][x].walls.bottom = false
        grid[y + 1][x].walls.top = false
      }
    }
  }

  return { grid, start, goal }
}

/**
 * Fill in empty areas of an existing maze with procedurally generated paths.
 * Cells that have any internal walls removed are considered "features" and preserved.
 * Only cells with all 4 walls intact (empty cells) will be filled with maze structure.
 */
export const fillInMaze = (grid: Cell[][], width: number, height: number): Cell[][] => {
  // Deep clone the grid to avoid mutating the original
  const newGrid: MutableCell[][] = grid.map((row) =>
    row.map((cell) => ({
      ...cell,
      walls: { ...cell.walls },
      visited: false,
    })),
  )

  // Track which cells are part of user features (should not be modified)
  const isFeatureCell: boolean[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => false),
  )

  // Detect feature cells - cells the user has modified
  // We use a heuristic: if a cell has ANY internal wall, it's part of a feature
  // (This handles the case where user clears all walls then builds structure by adding walls)
  // If a cell has NO internal walls (completely open), it's empty and should be filled
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = newGrid[y][x]

      // Check for internal walls (not boundary walls)
      const hasInternalTopWall = y > 0 && cell.walls.top
      const hasInternalBottomWall = y < height - 1 && cell.walls.bottom
      const hasInternalLeftWall = x > 0 && cell.walls.left
      const hasInternalRightWall = x < width - 1 && cell.walls.right

      // If the cell has ANY internal wall, it's part of a feature (user built something here)
      if (
        hasInternalTopWall ||
        hasInternalBottomWall ||
        hasInternalLeftWall ||
        hasInternalRightWall
      ) {
        isFeatureCell[y][x] = true
        cell.visited = true // Mark as visited so DFS won't touch it
      }
    }
  }

  // Add all walls to empty cells (cells that have no internal walls)
  // This is necessary because DFS works by REMOVING walls, but empty cells have no walls to remove
  // IMPORTANT: We must synchronize walls on BOTH sides, including with feature cells
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isFeatureCell[y][x]) {
        const cell = newGrid[y][x]
        // Add all internal walls (not boundary - those should stay as-is)
        // AND synchronize with ALL neighbors (including feature cells)
        if (y > 0) {
          cell.walls.top = true
          newGrid[y - 1][x].walls.bottom = true // Always sync, even for feature cells
        }
        if (y < height - 1) {
          cell.walls.bottom = true
          newGrid[y + 1][x].walls.top = true // Always sync, even for feature cells
        }
        if (x > 0) {
          cell.walls.left = true
          newGrid[y][x - 1].walls.right = true // Always sync, even for feature cells
        }
        if (x < width - 1) {
          cell.walls.right = true
          newGrid[y][x + 1].walls.left = true // Always sync, even for feature cells
        }
      }
    }
  }

  // Get unvisited non-feature neighbors for DFS
  const getEmptyNeighbors = (cell: MutableCell): MutableCell[] => {
    const neighbors: MutableCell[] = []
    const { x, y } = cell

    // Check all four directions, but only include cells that are:
    // 1. Within bounds
    // 2. Not visited
    // 3. Not feature cells
    if (y > 0 && !newGrid[y - 1][x].visited && !isFeatureCell[y - 1][x]) {
      neighbors.push(newGrid[y - 1][x])
    }
    if (y < height - 1 && !newGrid[y + 1][x].visited && !isFeatureCell[y + 1][x]) {
      neighbors.push(newGrid[y + 1][x])
    }
    if (x > 0 && !newGrid[y][x - 1].visited && !isFeatureCell[y][x - 1]) {
      neighbors.push(newGrid[y][x - 1])
    }
    if (x < width - 1 && !newGrid[y][x + 1].visited && !isFeatureCell[y][x + 1]) {
      neighbors.push(newGrid[y][x + 1])
    }

    return neighbors
  }

  // Run DFS maze generation on empty cells (cells with all walls intact)
  const runDFS = (startCell: MutableCell) => {
    const stack: MutableCell[] = []
    startCell.visited = true
    stack.push(startCell)

    while (stack.length > 0) {
      const current = stack[stack.length - 1]
      const neighbors = getEmptyNeighbors(current)

      if (neighbors.length === 0) {
        stack.pop()
      } else {
        const next = neighbors[Math.floor(Math.random() * neighbors.length)]
        removeWallBetween(current, next)
        next.visited = true
        stack.push(next)
      }
    }
  }

  // Run DFS from each unvisited, non-feature cell to fill in empty areas
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!newGrid[y][x].visited && !isFeatureCell[y][x]) {
        runDFS(newGrid[y][x])
      }
    }
  }

  // Connect the DFS-generated regions to the feature regions
  // Find cells at the boundary between features and generated areas
  const connections: Array<{ fx: number; fy: number; gx: number; gy: number }> = []

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Only look at feature cells
      if (!isFeatureCell[y][x]) continue

      // Check each neighbor - if it's a non-feature cell, this is a potential connection point
      const directions = [
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 },
      ]

      for (const { dx, dy } of directions) {
        const nx = x + dx
        const ny = y + dy

        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue

        // If neighbor is a generated cell (not a feature), record this connection opportunity
        if (!isFeatureCell[ny][nx]) {
          connections.push({ fx: x, fy: y, gx: nx, gy: ny })
        }
      }
    }
  }

  // Make at least one connection per feature region to ensure connectivity
  // Shuffle and pick connections
  const shuffled = connections.sort(() => Math.random() - 0.5)

  // Track which feature cells have been connected
  const connectedFeatures = new Set<string>()

  for (const { fx, fy, gx, gy } of shuffled) {
    const featureKey = `${fx},${fy}`

    // Always connect the first time we see a feature cell at a boundary
    // After that, connect with 20% probability for extra paths
    if (!connectedFeatures.has(featureKey) || Math.random() < 0.2) {
      const featureCell = newGrid[fy][fx]
      const generatedCell = newGrid[gy][gx]

      // Remove wall between feature and generated cell
      if (gx === fx && gy === fy - 1) {
        // Generated cell is above
        featureCell.walls.top = false
        generatedCell.walls.bottom = false
      } else if (gx === fx && gy === fy + 1) {
        // Generated cell is below
        featureCell.walls.bottom = false
        generatedCell.walls.top = false
      } else if (gx === fx - 1 && gy === fy) {
        // Generated cell is left
        featureCell.walls.left = false
        generatedCell.walls.right = false
      } else if (gx === fx + 1 && gy === fy) {
        // Generated cell is right
        featureCell.walls.right = false
        generatedCell.walls.left = false
      }

      connectedFeatures.add(featureKey)
    }
  }

  return newGrid
}
