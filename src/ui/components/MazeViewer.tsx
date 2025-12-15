import { useCallback, useEffect, useRef, useState } from 'react'
import type { EvaluationResult, MazeWithPrompts, Position } from '../../core/types'

const CELL_SIZE = 28
const WALL_WIDTH = 2
const PLAYER_COLOR = '#3b82f6' // blue
const GOAL_COLOR = '#22c55e' // green
const PATH_COLOR = 'rgba(59, 130, 246, 0.3)' // blue with opacity
const WALL_COLOR = '#64748b' // slate
const BG_COLOR = '#1e293b' // dark slate

interface MazeViewerProps {
  maze: MazeWithPrompts
  solution: EvaluationResult | null
  isReplaying: boolean
  onReplayComplete: () => void
}

export default function MazeViewer({
  maze,
  solution,
  isReplaying,
  onReplayComplete,
}: MazeViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [replayStep, setReplayStep] = useState(0)

  // Calculate canvas size
  const width = maze.width * CELL_SIZE + WALL_WIDTH
  const height = maze.height * CELL_SIZE + WALL_WIDTH

  // Calculate player position during replay
  const getPlayerPosition = useCallback((): Position => {
    if (!isReplaying || !solution?.parsedMoves) {
      return maze.start
    }

    let pos = { ...maze.start }
    const moves = solution.parsedMoves.slice(0, replayStep)

    for (const move of moves) {
      switch (move) {
        case 'UP':
          pos = { ...pos, y: pos.y - 1 }
          break
        case 'DOWN':
          pos = { ...pos, y: pos.y + 1 }
          break
        case 'LEFT':
          pos = { ...pos, x: pos.x - 1 }
          break
        case 'RIGHT':
          pos = { ...pos, x: pos.x + 1 }
          break
      }
    }

    return pos
  }, [isReplaying, solution?.parsedMoves, replayStep, maze.start])

  // Get path positions up to current replay step
  const getPathPositions = useCallback((): Position[] => {
    if (!solution?.parsedMoves) return []

    const positions: Position[] = [{ ...maze.start }]
    let pos = { ...maze.start }

    const limit = isReplaying ? replayStep : solution.parsedMoves.length

    for (let i = 0; i < limit; i++) {
      const move = solution.parsedMoves[i]!
      switch (move) {
        case 'UP':
          pos = { ...pos, y: pos.y - 1 }
          break
        case 'DOWN':
          pos = { ...pos, y: pos.y + 1 }
          break
        case 'LEFT':
          pos = { ...pos, x: pos.x - 1 }
          break
        case 'RIGHT':
          pos = { ...pos, x: pos.x + 1 }
          break
      }
      positions.push({ ...pos })
    }

    return positions
  }, [solution?.parsedMoves, isReplaying, replayStep, maze.start])

  // Replay animation
  useEffect(() => {
    if (!isReplaying || !solution?.parsedMoves) {
      setReplayStep(0)
      return
    }

    if (replayStep >= solution.parsedMoves.length) {
      onReplayComplete()
      return
    }

    const timer = setTimeout(() => {
      setReplayStep((s) => s + 1)
    }, 300)

    return () => clearTimeout(timer)
  }, [isReplaying, replayStep, solution?.parsedMoves, onReplayComplete])

  // Reset replay when solution changes
  useEffect(() => {
    setReplayStep(0)
  }, [solution])

  // Draw maze
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const playerPos = getPlayerPosition()
    const pathPositions = getPathPositions()
    const pathSet = new Set(pathPositions.map((p) => `${p.x},${p.y}`))

    // Clear canvas
    ctx.fillStyle = BG_COLOR
    ctx.fillRect(0, 0, width, height)

    // Draw cells and walls
    for (let y = 0; y < maze.height; y++) {
      for (let x = 0; x < maze.width; x++) {
        const cell = maze.grid[y]?.[x]
        if (!cell) continue

        const cx = x * CELL_SIZE + WALL_WIDTH / 2
        const cy = y * CELL_SIZE + WALL_WIDTH / 2

        // Draw path highlight
        if (pathSet.has(`${x},${y}`)) {
          ctx.fillStyle = PATH_COLOR
          ctx.fillRect(cx, cy, CELL_SIZE, CELL_SIZE)
        }

        // Draw walls
        ctx.strokeStyle = WALL_COLOR
        ctx.lineWidth = WALL_WIDTH

        if (cell.walls.top) {
          ctx.beginPath()
          ctx.moveTo(cx, cy)
          ctx.lineTo(cx + CELL_SIZE, cy)
          ctx.stroke()
        }
        if (cell.walls.right) {
          ctx.beginPath()
          ctx.moveTo(cx + CELL_SIZE, cy)
          ctx.lineTo(cx + CELL_SIZE, cy + CELL_SIZE)
          ctx.stroke()
        }
        if (cell.walls.bottom) {
          ctx.beginPath()
          ctx.moveTo(cx, cy + CELL_SIZE)
          ctx.lineTo(cx + CELL_SIZE, cy + CELL_SIZE)
          ctx.stroke()
        }
        if (cell.walls.left) {
          ctx.beginPath()
          ctx.moveTo(cx, cy)
          ctx.lineTo(cx, cy + CELL_SIZE)
          ctx.stroke()
        }
      }
    }

    // Draw goal
    const gx = maze.goal.x * CELL_SIZE + WALL_WIDTH / 2 + CELL_SIZE / 2
    const gy = maze.goal.y * CELL_SIZE + WALL_WIDTH / 2 + CELL_SIZE / 2
    ctx.fillStyle = GOAL_COLOR
    ctx.beginPath()
    ctx.arc(gx, gy, CELL_SIZE / 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'white'
    ctx.font = 'bold 12px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('G', gx, gy)

    // Draw player
    const px = playerPos.x * CELL_SIZE + WALL_WIDTH / 2 + CELL_SIZE / 2
    const py = playerPos.y * CELL_SIZE + WALL_WIDTH / 2 + CELL_SIZE / 2
    ctx.fillStyle = PLAYER_COLOR
    ctx.beginPath()
    ctx.arc(px, py, CELL_SIZE / 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'white'
    ctx.fillText('P', px, py)
  }, [maze, getPlayerPosition, getPathPositions, width, height])

  return (
    <div className="flex justify-center">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded border border-gray-700"
      />
    </div>
  )
}
