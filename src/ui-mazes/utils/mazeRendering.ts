/**
 * Maze rendering utilities for different output formats
 */

import type { Cell, ExitDoorPair, Hole, Position, WildcardTile } from '../types'
import { isPositionInHole } from './mazeFeatures'

export const renderMazeAsText = (
  grid: Cell[][],
  playerPos: Position,
  goalPos: Position,
  holes: Hole[] = [],
  wildcardTile: WildcardTile = null,
): string => {
  const height = grid.length
  const width = grid[0]?.length ?? 0
  const lines: string[] = []

  // Each cell is 3 chars wide, 2 chars tall (top border + content)
  for (let y = 0; y < height; y++) {
    let topLine = ''
    let midLine = ''

    for (let x = 0; x < width; x++) {
      const cell = grid[y][x]
      const isHole = isPositionInHole({ x, y }, holes)
      const isWildcard = wildcardTile && x === wildcardTile.x && y === wildcardTile.y

      // Top border - holes don't have walls
      if (isHole) {
        topLine += '+XX'
      } else {
        topLine += cell.walls.top ? '+--' : '+  '
      }

      // Left wall and content
      const leftWall = isHole ? 'X' : cell.walls.left ? '|' : ' '
      let content = '  '
      if (isHole) {
        content = 'XX'
      } else if (playerPos.x === x && playerPos.y === y) {
        content = 'P '
      } else if (goalPos.x === x && goalPos.y === y) {
        content = 'G '
      } else if (isWildcard) {
        content = '? '
      }
      midLine += leftWall + content
    }

    // Right edge
    topLine += '+'
    const lastCellIsHole = isPositionInHole({ x: width - 1, y }, holes)
    midLine += lastCellIsHole ? 'X' : grid[y][width - 1].walls.right ? '|' : ' '

    lines.push(topLine)
    lines.push(midLine)
  }

  // Bottom border
  let bottomLine = ''
  for (let x = 0; x < width; x++) {
    const isHole = isPositionInHole({ x, y: height - 1 }, holes)
    if (isHole) {
      bottomLine += '+XX'
    } else {
      bottomLine += grid[height - 1][x].walls.bottom ? '+--' : '+  '
    }
  }
  bottomLine += '+'
  lines.push(bottomLine)

  return lines.join('\n')
}

/**
 * Render maze as block format with thick walls.
 * Uses spaced symbols: # = wall, . = open path, P = player, G = goal
 * Adapted from lmiq-v1-beta for spatial reasoning tests.
 */
export const renderMazeAsBlocks = (
  grid: Cell[][],
  playerPos: Position,
  goalPos: Position,
  holes: Hole[] = [],
  wildcardTile: WildcardTile = null,
): string => {
  const height = grid.length
  const width = grid[0]?.length ?? 0

  // Block maze dimensions: (2*width+1) x (2*height+1)
  const blockHeight = 2 * height + 1
  const blockWidth = 2 * width + 1

  // Initialize all as walls
  const blocks: string[][] = []
  for (let by = 0; by < blockHeight; by++) {
    blocks.push(new Array(blockWidth).fill('#'))
  }

  // Carve out cells and passages
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = grid[y][x]
      const isHole = isPositionInHole({ x, y }, holes)
      const isWildcard = wildcardTile && x === wildcardTile.x && y === wildcardTile.y

      // Cell position in block coordinates
      const bx = 2 * x + 1
      const by = 2 * y + 1

      // Handle holes
      if (isHole) {
        blocks[by][bx] = 'X'
        continue
      }

      // Carve the cell itself
      blocks[by][bx] = '.'

      // Mark start, goal, wildcard
      if (playerPos.x === x && playerPos.y === y) {
        blocks[by][bx] = 'S'
      } else if (goalPos.x === x && goalPos.y === y) {
        blocks[by][bx] = 'G'
      } else if (isWildcard) {
        blocks[by][bx] = '?'
      }

      // Carve passages (remove walls between cells)
      if (!cell.walls.right && x < width - 1 && !isPositionInHole({ x: x + 1, y }, holes)) {
        blocks[by][bx + 1] = '.'
      }
      if (!cell.walls.bottom && y < height - 1 && !isPositionInHole({ x, y: y + 1 }, holes)) {
        blocks[by + 1][bx] = '.'
      }
    }
  }

  // Convert to spaced string format
  const lines: string[] = []
  for (let by = 0; by < blockHeight; by++) {
    lines.push(blocks[by].join(' '))
  }

  return lines.join('\n')
}

/**
 * Render maze as explicit graph edges with action labels.
 * Tests pure graph traversal without spatial reasoning.
 * Adapted from lmiq-v1-beta.
 */
export const renderMazeAsExplicitEdges = (
  grid: Cell[][],
  playerPos: Position,
  goalPos: Position,
  holes: Hole[] = [],
  exitDoorPair: ExitDoorPair | null = null,
  wildcardTile: WildcardTile = null,
): string => {
  const height = grid.length
  const width = grid[0]?.length ?? 0
  const lines: string[] = []

  // Helper to check if a cell has a portal exit in a direction
  const hasPortalExit = (
    x: number,
    y: number,
    direction: 'top' | 'bottom' | 'left' | 'right',
  ): boolean => {
    if (!exitDoorPair) return false
    const { portal1, portal2 } = exitDoorPair
    return (
      (portal1.x === x && portal1.y === y && portal1.side === direction) ||
      (portal2.x === x && portal2.y === y && portal2.side === direction)
    )
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = grid[y][x]
      const isHole = isPositionInHole({ x, y }, holes)

      // Hole cells have no neighbors
      if (isHole) {
        lines.push(`From Node (${x},${y}) [HOLE]: No moves available.`)
        continue
      }

      const edges: string[] = []

      // Check each direction with explicit action names
      if (!cell.walls.top && y > 0 && !isPositionInHole({ x, y: y - 1 }, holes)) {
        edges.push(`go UP to reach (${x},${y - 1})`)
      } else if (!cell.walls.top && y === 0 && hasPortalExit(x, y, 'top')) {
        edges.push('go UP to reach (?)')
      }

      if (!cell.walls.bottom && y < height - 1 && !isPositionInHole({ x, y: y + 1 }, holes)) {
        edges.push(`go DOWN to reach (${x},${y + 1})`)
      } else if (!cell.walls.bottom && y === height - 1 && hasPortalExit(x, y, 'bottom')) {
        edges.push('go DOWN to reach (?)')
      }

      if (!cell.walls.left && x > 0 && !isPositionInHole({ x: x - 1, y }, holes)) {
        edges.push(`go LEFT to reach (${x - 1},${y})`)
      } else if (!cell.walls.left && x === 0 && hasPortalExit(x, y, 'left')) {
        edges.push('go LEFT to reach (?)')
      }

      if (!cell.walls.right && x < width - 1 && !isPositionInHole({ x: x + 1, y }, holes)) {
        edges.push(`go RIGHT to reach (${x + 1},${y})`)
      } else if (!cell.walls.right && x === width - 1 && hasPortalExit(x, y, 'right')) {
        edges.push('go RIGHT to reach (?)')
      }

      // Mark special positions
      let marker = ''
      if (playerPos.x === x && playerPos.y === y) {
        marker = ' [START]'
      } else if (goalPos.x === x && goalPos.y === y) {
        marker = ' [GOAL]'
      } else if (wildcardTile && x === wildcardTile.x && y === wildcardTile.y) {
        marker = ' [?]'
      }

      // Format as natural language
      let edgesStr: string
      if (edges.length === 0) {
        edgesStr = 'No moves available.'
      } else if (edges.length === 1) {
        edgesStr = `You can ${edges[0]}.`
      } else {
        const allButLast = edges.slice(0, -1)
        const lastEdge = edges[edges.length - 1]
        edgesStr = `You can ${allButLast.join(', ')} OR ${lastEdge}.`
      }

      lines.push(`From Node (${x},${y})${marker}: ${edgesStr}`)
    }
  }

  return lines.join('\n')
}

/**
 * Render maze as a graph adjacency list.
 * Each node is a coordinate, edges are valid moves to neighboring cells.
 */
export const renderMazeAsAdjacencyList = (
  grid: Cell[][],
  playerPos: Position,
  goalPos: Position,
  holes: Hole[] = [],
  exitDoorPair: ExitDoorPair | null = null,
  wildcardTile: WildcardTile = null,
): string => {
  const height = grid.length
  const width = grid[0]?.length ?? 0
  const lines: string[] = []

  // Helper to check if a cell has a portal exit in a direction
  const hasPortalExit = (
    x: number,
    y: number,
    direction: 'top' | 'bottom' | 'left' | 'right',
  ): boolean => {
    if (!exitDoorPair) return false
    const { portal1, portal2 } = exitDoorPair
    return (
      (portal1.x === x && portal1.y === y && portal1.side === direction) ||
      (portal2.x === x && portal2.y === y && portal2.side === direction)
    )
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = grid[y][x]
      const isHole = isPositionInHole({ x, y }, holes)

      // Hole cells have no neighbors and are marked specially
      if (isHole) {
        lines.push(`(${x},${y}) [HOLE] -> (none - void)`)
        continue
      }

      const neighbors: string[] = []

      // Check each direction for valid moves (exclude moves into holes)
      if (!cell.walls.top && y > 0 && !isPositionInHole({ x, y: y - 1 }, holes)) {
        neighbors.push(`(${x},${y - 1})`)
      }
      // Portal exit upward (at top edge, no wall)
      if (!cell.walls.top && y === 0 && hasPortalExit(x, y, 'top')) {
        neighbors.push('(?)') // Unknown destination
      }

      if (!cell.walls.right && x < width - 1 && !isPositionInHole({ x: x + 1, y }, holes)) {
        neighbors.push(`(${x + 1},${y})`)
      }
      // Portal exit rightward (at right edge, no wall)
      if (!cell.walls.right && x === width - 1 && hasPortalExit(x, y, 'right')) {
        neighbors.push('(?)') // Unknown destination
      }

      if (!cell.walls.bottom && y < height - 1 && !isPositionInHole({ x, y: y + 1 }, holes)) {
        neighbors.push(`(${x},${y + 1})`)
      }
      // Portal exit downward (at bottom edge, no wall)
      if (!cell.walls.bottom && y === height - 1 && hasPortalExit(x, y, 'bottom')) {
        neighbors.push('(?)') // Unknown destination
      }

      if (!cell.walls.left && x > 0 && !isPositionInHole({ x: x - 1, y }, holes)) {
        neighbors.push(`(${x - 1},${y})`)
      }
      // Portal exit leftward (at left edge, no wall)
      if (!cell.walls.left && x === 0 && hasPortalExit(x, y, 'left')) {
        neighbors.push('(?)') // Unknown destination
      }

      // Add marker for player/goal/wildcard
      let marker = ''
      if (playerPos.x === x && playerPos.y === y) marker = ' [PLAYER START]'
      else if (goalPos.x === x && goalPos.y === y) marker = ' [GOAL]'
      else if (wildcardTile && x === wildcardTile.x && y === wildcardTile.y) marker = ' [?]'

      lines.push(
        `(${x},${y})${marker} -> ${neighbors.length > 0 ? neighbors.join(', ') : '(none)'}`,
      )
    }
  }

  return lines.join('\n')
}

/**
 * Render maze as a dense coordinate matrix.
 * Each cell shows which directions are passable: U(p), D(own), L(eft), R(ight)
 * Portal exits are shown as ? (e.g., "?..." means up leads to unknown destination)
 */
export const renderMazeAsCoordinateMatrix = (
  grid: Cell[][],
  playerPos: Position,
  goalPos: Position,
  holes: Hole[] = [],
  exitDoorPair: ExitDoorPair | null = null,
  wildcardTile: WildcardTile = null,
): string => {
  const height = grid.length
  const width = grid[0]?.length ?? 0
  const lines: string[] = []

  // Helper to check if a cell has a portal exit in a direction
  const hasPortalExit = (
    x: number,
    y: number,
    direction: 'top' | 'bottom' | 'left' | 'right',
  ): boolean => {
    if (!exitDoorPair) return false
    const { portal1, portal2 } = exitDoorPair
    return (
      (portal1.x === x && portal1.y === y && portal1.side === direction) ||
      (portal2.x === x && portal2.y === y && portal2.side === direction)
    )
  }

  // Header row with x coordinates
  let header = '    '
  for (let x = 0; x < width; x++) {
    header += `x=${x}`.padStart(7)
  }
  lines.push(header)

  for (let y = 0; y < height; y++) {
    let line = `y=${y} `.padEnd(4)

    for (let x = 0; x < width; x++) {
      const cell = grid[y][x]
      const isHole = isPositionInHole({ x, y }, holes)

      // Holes are marked specially with no valid moves
      if (isHole) {
        line += 'H:....'.padStart(7)
        continue
      }

      let moves = ''

      // Build move string: UDLR format (exclude moves into holes)
      // Use '?' for portal exits to unknown destination
      if (!cell.walls.top && y > 0 && !isPositionInHole({ x, y: y - 1 }, holes)) {
        moves += 'U'
      } else if (!cell.walls.top && y === 0 && hasPortalExit(x, y, 'top')) {
        moves += '?' // Portal exit up
      } else {
        moves += '.'
      }

      if (!cell.walls.bottom && y < height - 1 && !isPositionInHole({ x, y: y + 1 }, holes)) {
        moves += 'D'
      } else if (!cell.walls.bottom && y === height - 1 && hasPortalExit(x, y, 'bottom')) {
        moves += '?' // Portal exit down
      } else {
        moves += '.'
      }

      if (!cell.walls.left && x > 0 && !isPositionInHole({ x: x - 1, y }, holes)) {
        moves += 'L'
      } else if (!cell.walls.left && x === 0 && hasPortalExit(x, y, 'left')) {
        moves += '?' // Portal exit left
      } else {
        moves += '.'
      }

      if (!cell.walls.right && x < width - 1 && !isPositionInHole({ x: x + 1, y }, holes)) {
        moves += 'R'
      } else if (!cell.walls.right && x === width - 1 && hasPortalExit(x, y, 'right')) {
        moves += '?' // Portal exit right
      } else {
        moves += '.'
      }

      // Add marker for player/goal/wildcard
      if (playerPos.x === x && playerPos.y === y) moves = `P:${moves}`
      else if (goalPos.x === x && goalPos.y === y) moves = `G:${moves}`
      else if (wildcardTile && x === wildcardTile.x && y === wildcardTile.y) moves = `W:${moves}`
      else moves = `  ${moves}`

      line += moves.padStart(7)
    }

    lines.push(line)
  }

  return lines.join('\n')
}

/**
 * Render maze as 2D matrix with explicit valid moves.
 * Format matches lmiq-v1-beta for evaluation consistency.
 */
export const renderMazeAs2DMatrix = (
  grid: Cell[][],
  playerPos: Position,
  goalPos: Position,
  holes: Hole[] = [],
  wildcardTile: WildcardTile = null,
): string => {
  const height = grid.length
  const width = grid[0]?.length ?? 0
  const lines: string[] = []

  // Part 1: Visual grid
  lines.push('=== MAZE GRID ===')
  lines.push(`Dimensions: ${width}x${height}`)
  lines.push(`Player Start: (${playerPos.x},${playerPos.y})`)
  lines.push(`Goal: (${goalPos.x},${goalPos.y})`)
  lines.push('')

  // Header row
  let header = '   '
  for (let x = 0; x < width; x++) {
    header += x.toString().padStart(3, ' ')
  }
  lines.push(header)

  for (let y = 0; y < height; y++) {
    let line = `${y.toString().padStart(2, ' ')} `

    for (let x = 0; x < width; x++) {
      const isHole = isPositionInHole({ x, y }, holes)
      const isPlayer = playerPos.x === x && playerPos.y === y
      const isGoal = goalPos.x === x && goalPos.y === y
      const isWildcard = wildcardTile && x === wildcardTile.x && y === wildcardTile.y

      let cellChar: string
      if (isHole) {
        cellChar = ' X '
      } else if (isPlayer) {
        cellChar = ' P '
      } else if (isGoal) {
        cellChar = ' G '
      } else if (isWildcard) {
        cellChar = ' ? '
      } else {
        cellChar = ' . '
      }
      line += cellChar
    }

    lines.push(line)
  }

  // Part 2: Valid moves list
  lines.push('')
  lines.push('=== VALID MOVES ===')
  lines.push('')

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = grid[y][x]
      const isHole = isPositionInHole({ x, y }, holes)

      if (isHole) continue // Skip holes - can't move from them

      const moves: string[] = []

      // Check each direction - can move if no wall AND destination is not a hole
      if (!cell.walls.top && y > 0 && !isPositionInHole({ x, y: y - 1 }, holes)) {
        moves.push('UP')
      }
      if (!cell.walls.bottom && y < height - 1 && !isPositionInHole({ x, y: y + 1 }, holes)) {
        moves.push('DOWN')
      }
      if (!cell.walls.left && x > 0 && !isPositionInHole({ x: x - 1, y }, holes)) {
        moves.push('LEFT')
      }
      if (!cell.walls.right && x < width - 1 && !isPositionInHole({ x: x + 1, y }, holes)) {
        moves.push('RIGHT')
      }

      // Add marker for player/goal
      const isPlayer = playerPos.x === x && playerPos.y === y
      const isGoal = goalPos.x === x && goalPos.y === y
      const marker = isPlayer ? ' <- PLAYER' : isGoal ? ' <- GOAL' : ''

      const movesStr = moves.length > 0 ? `[${moves.join(', ')}]` : '[none]'
      lines.push(`(${x},${y}): ${movesStr}${marker}`)
    }
  }

  return lines.join('\n')
}

/**
 * Render maze using the MazeBench Coordinate Token format.
 * Each cell is represented as: <|row-col|><|wall_token|><|content_token|>
 *
 * Wall tokens use combinations of up/down/left/right (e.g., <|up_left_wall|>)
 * Content tokens: <|blank|>, <|origin|>, <|target|>, <|void|>, <|portal|>, <|wildcard|>
 *
 * Reference: https://arxiv.org/html/2502.14669v1
 */
export const renderMazeAsCoordinateToken = (
  grid: Cell[][],
  playerPos: Position,
  goalPos: Position,
  holes: Hole[] = [],
  exitDoorPair: ExitDoorPair | null = null,
  wildcardTile: WildcardTile = null,
): string => {
  const height = grid.length
  const width = grid[0]?.length ?? 0
  const lines: string[] = []

  // Helper to check if a position is a portal
  const isPortalPosition = (x: number, y: number): boolean => {
    if (!exitDoorPair) return false
    const { portal1, portal2 } = exitDoorPair
    return (portal1.x === x && portal1.y === y) || (portal2.x === x && portal2.y === y)
  }

  for (let row = 0; row < height; row++) {
    let rowStr = ''

    for (let col = 0; col < width; col++) {
      const cell = grid[row][col]

      // Build coordinate token: <|row-col|>
      rowStr += `<|${row}-${col}|>`

      // Build wall token from cell walls (top→up, bottom→down)
      // Order must be consistent: up, down, left, right
      const walls: string[] = []
      if (cell.walls.top) walls.push('up')
      if (cell.walls.bottom) walls.push('down')
      if (cell.walls.left) walls.push('left')
      if (cell.walls.right) walls.push('right')

      const wallToken = walls.length === 0 ? 'no_wall' : `${walls.join('_')}_wall`
      rowStr += `<|${wallToken}|>`

      // Build content token (priority: origin > target > void > portal > wildcard > blank)
      const isStart = col === playerPos.x && row === playerPos.y
      const isGoal = col === goalPos.x && row === goalPos.y
      const isHole = isPositionInHole({ x: col, y: row }, holes)
      const isPortal = isPortalPosition(col, row)
      const isWildcard = wildcardTile && wildcardTile.x === col && wildcardTile.y === row

      let contentToken = 'blank'
      if (isStart) contentToken = 'origin'
      else if (isGoal) contentToken = 'target'
      else if (isHole) contentToken = 'void'
      else if (isPortal) contentToken = 'portal'
      else if (isWildcard) contentToken = 'wildcard'

      rowStr += `<|${contentToken}|>`
    }

    lines.push(rowStr)
  }

  return lines.join('\n')
}

/**
 * Render maze as combined edges + ASCII format.
 * Provides both the explicit graph edges and visual ASCII representation.
 * Format matches lmiq-v1-beta for evaluation consistency.
 */
export const renderMazeAsEdgesAscii = (
  grid: Cell[][],
  playerPos: Position,
  goalPos: Position,
  holes: Hole[] = [],
  exitDoorPair: ExitDoorPair | null = null,
  wildcardTile: WildcardTile = null,
): string => {
  const lines: string[] = []

  // Add edges section
  lines.push(renderMazeAsExplicitEdges(grid, playerPos, goalPos, holes, exitDoorPair, wildcardTile))
  lines.push('')

  // Add ASCII section
  lines.push('--- ASCII VISUALIZATION ---')
  lines.push('')
  lines.push(renderMazeAsText(grid, playerPos, goalPos, holes, wildcardTile))

  return lines.join('\n')
}
