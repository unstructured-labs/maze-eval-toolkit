/**
 * Maze rendering utilities for generating prompts
 *
 * Supports multiple formats:
 * - ASCII: Visual grid representation
 * - Adjacency: Graph format showing connections
 * - Coordinate Matrix: Dense matrix with move notation
 * - 2D Matrix: Grid + explicit valid moves per cell
 */

import { getValidMoves } from './maze-solver'
import type { GeneratedMaze, Position, PromptFormat } from './types'

/**
 * Maze renderer interface for extensibility
 */
export interface MazeRenderer {
  name: PromptFormat
  render(maze: GeneratedMaze): string
}

/**
 * Render maze as ASCII art
 */
export function renderASCII(maze: GeneratedMaze): string {
  const { grid, start, goal } = maze
  const height = grid.length
  const width = grid[0]?.length ?? 0
  const lines: string[] = []

  // Each cell is 3 chars wide, 2 chars tall (top border + content)
  for (let y = 0; y < height; y++) {
    let topLine = ''
    let midLine = ''

    for (let x = 0; x < width; x++) {
      const cell = grid[y]![x]!

      // Top border
      topLine += cell.walls.top ? '+--' : '+  '

      // Left wall and content
      const leftWall = cell.walls.left ? '|' : ' '
      let content = '  '
      if (start.x === x && start.y === y) {
        content = 'P '
      } else if (goal.x === x && goal.y === y) {
        content = 'G '
      }
      midLine += leftWall + content
    }

    // Right edge
    topLine += '+'
    midLine += grid[y]![width - 1]!.walls.right ? '|' : ' '

    lines.push(topLine)
    lines.push(midLine)
  }

  // Bottom border
  let bottomLine = ''
  for (let x = 0; x < width; x++) {
    const cell = grid[height - 1]![x]!
    bottomLine += cell.walls.bottom ? '+--' : '+  '
  }
  bottomLine += '+'
  lines.push(bottomLine)

  return lines.join('\n')
}

/**
 * Render maze as adjacency list (graph format)
 */
export function renderAdjacency(maze: GeneratedMaze): string {
  const { grid, start, goal } = maze
  const height = grid.length
  const width = grid[0]?.length ?? 0
  const lines: string[] = []

  lines.push('Adjacency List (each cell shows its neighbors):')
  lines.push('')

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = grid[y]![x]!
      const neighbors: string[] = []

      // Check each direction
      if (!cell.walls.top && y > 0) {
        neighbors.push(`(${x},${y - 1})`)
      }
      if (!cell.walls.bottom && y < height - 1) {
        neighbors.push(`(${x},${y + 1})`)
      }
      if (!cell.walls.left && x > 0) {
        neighbors.push(`(${x - 1},${y})`)
      }
      if (!cell.walls.right && x < width - 1) {
        neighbors.push(`(${x + 1},${y})`)
      }

      // Mark special positions
      let marker = ''
      if (start.x === x && start.y === y) {
        marker = ' [PLAYER START]'
      } else if (goal.x === x && goal.y === y) {
        marker = ' [GOAL]'
      }

      const neighborStr = neighbors.length > 0 ? neighbors.join(', ') : '(none)'
      lines.push(`(${x},${y})${marker} -> ${neighborStr}`)
    }
  }

  return lines.join('\n')
}

/**
 * Render maze as coordinate matrix with move notation
 */
export function renderCoordMatrix(maze: GeneratedMaze): string {
  const { grid, start, goal } = maze
  const height = grid.length
  const width = grid[0]?.length ?? 0
  const lines: string[] = []

  lines.push('Coordinate Matrix (U=Up, D=Down, L=Left, R=Right, .=blocked):')
  lines.push('')

  // Header row with x coordinates
  let header = '    '
  for (let x = 0; x < width; x++) {
    header += x.toString().padStart(5, ' ')
  }
  lines.push(header)
  lines.push('')

  for (let y = 0; y < height; y++) {
    let line = `${y.toString().padStart(2, ' ')}  `

    for (let x = 0; x < width; x++) {
      const cell = grid[y]![x]!
      let moves = ''

      // Build move string
      moves += !cell.walls.top && y > 0 ? 'U' : '.'
      moves += !cell.walls.bottom && y < height - 1 ? 'D' : '.'
      moves += !cell.walls.left && x > 0 ? 'L' : '.'
      moves += !cell.walls.right && x < width - 1 ? 'R' : '.'

      // Mark special positions
      if (start.x === x && start.y === y) {
        moves = `P${moves.slice(1)}`
      } else if (goal.x === x && goal.y === y) {
        moves = `G${moves.slice(1)}`
      }

      line += moves.padStart(5, ' ')
    }

    lines.push(line)
  }

  return lines.join('\n')
}

/**
 * Render maze as 2D matrix with explicit valid moves
 */
export function renderMatrix2D(maze: GeneratedMaze): string {
  const { grid, start, goal } = maze
  const height = grid.length
  const width = grid[0]?.length ?? 0
  const lines: string[] = []

  // Part 1: Visual grid
  lines.push('=== MAZE GRID ===')
  lines.push(`Dimensions: ${width}x${height}`)
  lines.push(`Player Start: (${start.x},${start.y})`)
  lines.push(`Goal: (${goal.x},${goal.y})`)
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
      let cellChar = ' . '
      if (start.x === x && start.y === y) {
        cellChar = ' P '
      } else if (goal.x === x && goal.y === y) {
        cellChar = ' G '
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
      const pos: Position = { x, y }
      const validMoves = getValidMoves(grid, pos)

      let marker = ''
      if (start.x === x && start.y === y) {
        marker = ' <- PLAYER'
      } else if (goal.x === x && goal.y === y) {
        marker = ' <- GOAL'
      }

      const movesStr = validMoves.length > 0 ? `[${validMoves.join(', ')}]` : '[none]'
      lines.push(`(${x},${y}): ${movesStr}${marker}`)
    }
  }

  return lines.join('\n')
}

/**
 * All available renderers
 */
export const RENDERERS: Record<PromptFormat, MazeRenderer> = {
  ascii: { name: 'ascii', render: renderASCII },
  adjacency: { name: 'adjacency', render: renderAdjacency },
  coordmatrix: { name: 'coordmatrix', render: renderCoordMatrix },
  matrix2d: { name: 'matrix2d', render: renderMatrix2D },
}

/**
 * Generate a complete prompt for LLM evaluation
 */
export function generatePrompt(maze: GeneratedMaze, formats: PromptFormat[]): string {
  const sections: string[] = []

  // Introduction
  sections.push(
    'You are navigating a maze. Your task is to find the path from the start position (P) to the goal (G).',
  )
  sections.push('')
  sections.push(`Maze dimensions: ${maze.width}x${maze.height}`)
  sections.push(`Start position: (${maze.start.x},${maze.start.y})`)
  sections.push(`Goal position: (${maze.goal.x},${maze.goal.y})`)
  sections.push('')

  // Add requested format sections
  for (const format of formats) {
    const renderer = RENDERERS[format]
    if (renderer) {
      sections.push(`--- ${format.toUpperCase()} VIEW ---`)
      sections.push('')
      sections.push(renderer.render(maze))
      sections.push('')
    }
  }

  // Instructions
  sections.push('--- INSTRUCTIONS ---')
  sections.push('')
  sections.push(
    'Provide your solution as a JSON array of moves. Each move should be an object with an "action" field.',
  )
  sections.push('Valid actions are: UP, DOWN, LEFT, RIGHT')
  sections.push('')
  sections.push('Example response format:')
  sections.push('[{"action": "DOWN"}, {"action": "RIGHT"}, {"action": "DOWN"}]')
  sections.push('')
  sections.push('Respond with ONLY the JSON array of moves, no additional text.')

  return sections.join('\n')
}

/**
 * Generate all prompts for a maze
 */
export function generateAllPrompts(maze: GeneratedMaze): Record<PromptFormat, string> {
  return {
    ascii: generatePrompt(maze, ['ascii']),
    adjacency: generatePrompt(maze, ['adjacency']),
    coordmatrix: generatePrompt(maze, ['coordmatrix']),
    matrix2d: generatePrompt(maze, ['matrix2d']),
  }
}
