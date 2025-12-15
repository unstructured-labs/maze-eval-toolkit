import { useCallback, useEffect, useRef, useState } from 'react'
import type { Difficulty, MazeWithPrompts, MoveAction, Position } from '../../core/types'

const CELL_SIZE = 28
const WALL_WIDTH = 2
const PLAYER_COLOR = '#3b82f6' // blue
const GOAL_COLOR = '#22c55e' // green
const PATH_COLOR = 'rgba(59, 130, 246, 0.3)' // blue with opacity
const WALL_COLOR = '#64748b' // slate
const BG_COLOR = '#1e293b' // dark slate

// Fixed container size for obfuscation (based on nightmare difficulty max size)
const FIXED_CONTAINER_SIZE = 600

export interface HumanMazeResult {
  mazeId: string
  difficulty: Difficulty
  moves: MoveAction[]
  timeMs: number
  pathLength: number
  shortestPath: number
  efficiency: number
}

interface InteractiveMazeProps {
  maze: MazeWithPrompts
  isObfuscated: boolean
  onReveal: () => void
  onComplete: (result: HumanMazeResult) => void
}

export default function InteractiveMaze({
  maze,
  isObfuscated,
  onReveal,
  onComplete,
}: InteractiveMazeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Player state
  const [playerPos, setPlayerPos] = useState<Position>({ ...maze.start })
  const [moves, setMoves] = useState<MoveAction[]>([])
  const [pathPositions, setPathPositions] = useState<Position[]>([{ ...maze.start }])

  // Timer state
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)

  // Goal state
  const [hasReachedGoal, setHasReachedGoal] = useState(false)

  // Calculate canvas size
  const canvasWidth = maze.width * CELL_SIZE + WALL_WIDTH
  const canvasHeight = maze.height * CELL_SIZE + WALL_WIDTH

  // Reset state when maze changes
  useEffect(() => {
    setPlayerPos({ ...maze.start })
    setMoves([])
    setPathPositions([{ ...maze.start }])
    setStartTime(null)
    setElapsedMs(0)
    setHasReachedGoal(false)
  }, [maze])

  // Timer effect
  useEffect(() => {
    if (!startTime || hasReachedGoal) return

    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startTime)
    }, 100)

    return () => clearInterval(interval)
  }, [startTime, hasReachedGoal])

  // Check if move is valid (no wall blocking)
  const canMove = useCallback(
    (from: Position, direction: MoveAction): boolean => {
      const cell = maze.grid[from.y]?.[from.x]
      if (!cell) return false

      switch (direction) {
        case 'UP':
          return !cell.walls.top && from.y > 0
        case 'DOWN':
          return !cell.walls.bottom && from.y < maze.height - 1
        case 'LEFT':
          return !cell.walls.left && from.x > 0
        case 'RIGHT':
          return !cell.walls.right && from.x < maze.width - 1
      }
    },
    [maze],
  )

  // Move player
  const movePlayer = useCallback(
    (direction: MoveAction) => {
      if (hasReachedGoal || isObfuscated) return

      if (!canMove(playerPos, direction)) return

      let newPos: Position
      switch (direction) {
        case 'UP':
          newPos = { x: playerPos.x, y: playerPos.y - 1 }
          break
        case 'DOWN':
          newPos = { x: playerPos.x, y: playerPos.y + 1 }
          break
        case 'LEFT':
          newPos = { x: playerPos.x - 1, y: playerPos.y }
          break
        case 'RIGHT':
          newPos = { x: playerPos.x + 1, y: playerPos.y }
          break
      }

      setPlayerPos(newPos)
      setMoves((prev) => [...prev, direction])
      setPathPositions((prev) => [...prev, newPos])

      // Check if reached goal
      if (newPos.x === maze.goal.x && newPos.y === maze.goal.y) {
        setHasReachedGoal(true)
      }
    },
    [playerPos, canMove, hasReachedGoal, isObfuscated, maze.goal],
  )

  // Keyboard event handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Spacebar to reveal
      if (e.code === 'Space' && isObfuscated) {
        e.preventDefault()
        onReveal()
        setStartTime(Date.now())
        return
      }

      // Enter to complete (after reaching goal)
      if (e.code === 'Enter' && hasReachedGoal) {
        e.preventDefault()
        const finalTimeMs = startTime ? Date.now() - startTime : 0
        const pathLength = moves.length
        const efficiency = pathLength > 0 ? maze.shortestPath / pathLength : 0

        onComplete({
          mazeId: maze.id,
          difficulty: maze.difficulty,
          moves,
          timeMs: finalTimeMs,
          pathLength,
          shortestPath: maze.shortestPath,
          efficiency,
        })
        return
      }

      // Arrow keys to move
      if (!isObfuscated && !hasReachedGoal) {
        switch (e.code) {
          case 'ArrowUp':
            e.preventDefault()
            movePlayer('UP')
            break
          case 'ArrowDown':
            e.preventDefault()
            movePlayer('DOWN')
            break
          case 'ArrowLeft':
            e.preventDefault()
            movePlayer('LEFT')
            break
          case 'ArrowRight':
            e.preventDefault()
            movePlayer('RIGHT')
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isObfuscated, hasReachedGoal, movePlayer, onReveal, onComplete, moves, startTime, maze])

  // Focus container for keyboard events
  useEffect(() => {
    containerRef.current?.focus()
  }, [])

  // Draw maze
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const pathSet = new Set(pathPositions.map((p) => `${p.x},${p.y}`))

    // Clear canvas
    ctx.fillStyle = BG_COLOR
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

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
  }, [maze, playerPos, pathPositions, canvasWidth, canvasHeight])

  // Format elapsed time
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    const tenths = Math.floor((ms % 1000) / 100)
    return `${minutes}:${secs.toString().padStart(2, '0')}.${tenths}`
  }

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center outline-none"
      // biome-ignore lint/a11y/noNoninteractiveTabindex: Interactive game element needs keyboard focus
      tabIndex={0}
    >
      {/* Timer display */}
      {!isObfuscated && (
        <div className="mb-4 text-2xl font-mono tabular-nums">{formatTime(elapsedMs)}</div>
      )}

      {/* Fixed size container for consistent blur appearance */}
      <div
        className="relative flex items-center justify-center"
        style={{ width: FIXED_CONTAINER_SIZE, height: FIXED_CONTAINER_SIZE }}
      >
        {/* Canvas centered in container */}
        <div className={isObfuscated ? 'blur-[20px]' : ''}>
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            className="rounded border border-gray-700"
          />
        </div>

        {/* Obfuscation overlay */}
        {isObfuscated && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 rounded">
            <p className="text-2xl font-bold mb-2">Ready?</p>
            <p className="text-muted-foreground">Press SPACE to start</p>
          </div>
        )}

        {/* Goal reached overlay */}
        {hasReachedGoal && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 rounded">
            <p className="text-2xl font-bold text-green-500 mb-2">Goal Reached!</p>
            <p className="text-lg mb-1">Time: {formatTime(elapsedMs)}</p>
            <p className="text-lg mb-1">Moves: {moves.length}</p>
            <p className="text-lg mb-4">
              Efficiency: {((maze.shortestPath / moves.length) * 100).toFixed(0)}%
            </p>
            <p className="text-muted-foreground">Press ENTER to continue</p>
          </div>
        )}
      </div>

      {/* Instructions */}
      {!isObfuscated && !hasReachedGoal && (
        <div className="mt-4 text-sm text-muted-foreground">Use arrow keys to navigate</div>
      )}
    </div>
  )
}
