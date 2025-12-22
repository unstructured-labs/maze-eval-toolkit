import { useEffect, useRef, useState } from 'react'

// TypeScript type definitions
interface Position {
  x: number
  y: number
}

interface Corner {
  x: number
  y: number
}

interface Corners {
  0: Corner
  1: Corner
  2: Corner
  3: Corner
  [key: number]: Corner
}

interface Config {
  size: number
  gap: number
  containerSize: number
  corners: Corners
}

// Helper to safely access array elements with default value
const defaultPos: Position = { x: 0, y: 0 }

const safeCorner = (corners: Corners, index: number | undefined): Corner => {
  if (index === undefined) return defaultPos
  return corners[index] ?? defaultPos
}

interface Pattern {
  name: string
  description: string
  squareCount: number
  getPositions: (time: number, config: Config) => Position[]
}

export interface AnimatedSquaresProps {
  pattern?: keyof typeof patterns
  size?: number
  gap?: number
  color?: string
  uniformColor?: boolean
  speed?: number
}

// Animation pattern definitions - easily extensible
const patterns = {
  // Original chase pattern (like SquareLoader)
  chase: {
    name: 'Chase',
    description: 'Squares chase each other around corners',
    squareCount: 3,
    getPositions: (time: number, config: Config) => {
      const { corners } = config
      const cycle = Math.floor(time / 4) % 4
      const phase = time % 4

      return [0, 1, 2].map((i) => {
        const baseCorner = (cycle + i) % 4
        const nextCorner = (baseCorner + 1) % 4
        const delay = i * 0.3
        const progress = Math.max(0, Math.min(1, (phase - delay) / 0.5))
        const eased = progress < 0.5 ? 2 * progress * progress : 1 - (-2 * progress + 2) ** 2 / 2

        const base = safeCorner(corners, baseCorner)
        const next = safeCorner(corners, nextCorner)
        return {
          x: base.x + (next.x - base.x) * eased,
          y: base.y + (next.y - base.y) * eased,
        }
      })
    },
  },

  // Orbit pattern - squares rotate around center
  orbit: {
    name: 'Orbit',
    description: 'Squares orbit around the center',
    squareCount: 4,
    getPositions: (time: number, config: Config) => {
      const { size, gap, containerSize } = config
      const center = containerSize / 2 - size / 2
      const radius = (size + gap) / 2

      return [0, 1, 2, 3].map((i) => {
        const angle = (time * 0.8 + (i * Math.PI) / 2) % (Math.PI * 2)
        return {
          x: center + Math.cos(angle) * radius,
          y: center + Math.sin(angle) * radius,
        }
      })
    },
  },

  // Shuffle pattern - squares randomly swap positions
  shuffle: {
    name: 'Shuffle',
    description: 'Squares shuffle between corner positions',
    squareCount: 4,
    getPositions: (time: number, config: Config) => {
      const { corners } = config
      const cycle = Math.floor(time / 1.5)
      const progress = (time % 1.5) / 1.5
      const eased =
        progress < 0.5 ? 4 * progress * progress * progress : 1 - (-2 * progress + 2) ** 3 / 2

      const shuffles = [
        [0, 1, 2, 3],
        [1, 3, 0, 2],
        [3, 2, 1, 0],
        [2, 0, 3, 1],
      ] as const
      const currentOrder = shuffles[cycle % shuffles.length] ?? [0, 1, 2, 3]
      const nextOrder = shuffles[(cycle + 1) % shuffles.length] ?? [0, 1, 2, 3]

      return [0, 1, 2, 3].map((i) => {
        const from = safeCorner(corners, currentOrder[i])
        const to = safeCorner(corners, nextOrder[i])
        return {
          x: from.x + (to.x - from.x) * eased,
          y: from.y + (to.y - from.y) * eased,
        }
      })
    },
  },

  // Bounce pattern - squares bounce between positions
  bounce: {
    name: 'Bounce',
    description: 'Squares bounce with elastic easing',
    squareCount: 3,
    getPositions: (time: number, config: Config) => {
      const { corners } = config

      return [0, 1, 2].map((i) => {
        const cycle = Math.floor((time + i * 0.5) / 2) % 2
        const progress = ((time + i * 0.5) % 2) / 2

        const c4 = (2 * Math.PI) / 3
        const eased =
          progress === 0
            ? 0
            : progress === 1
              ? 1
              : 2 ** (-10 * progress) * Math.sin((progress * 10 - 0.75) * c4) + 1

        const positions: [Corner, Corner][] = [
          [safeCorner(corners, 0), safeCorner(corners, 2)],
          [safeCorner(corners, 1), safeCorner(corners, 3)],
          [safeCorner(corners, 0), safeCorner(corners, 1)],
        ]

        const pos = positions[i] ?? [defaultPos, defaultPos]
        const [from, to] = cycle === 0 ? pos : [pos[1], pos[0]]

        return {
          x: from.x + (to.x - from.x) * eased,
          y: from.y + (to.y - from.y) * eased,
        }
      })
    },
  },

  // Grid shift pattern
  gridShift: {
    name: 'Grid Shift',
    description: 'Squares shift in a grid formation',
    squareCount: 4,
    getPositions: (time: number, config: Config) => {
      const { size, gap } = config
      const unit = size + gap
      const cycle = Math.floor(time / 1.2) % 4
      const progress = (time % 1.2) / 1.2
      const eased = 1 - (1 - progress) ** 3

      const formations = [
        [
          { x: 0, y: 0 },
          { x: unit, y: 0 },
          { x: 0, y: unit },
          { x: unit, y: unit },
        ],
        [
          { x: unit / 2, y: 0 },
          { x: unit, y: unit / 2 },
          { x: unit / 2, y: unit },
          { x: 0, y: unit / 2 },
        ],
        [
          { x: unit, y: 0 },
          { x: unit, y: unit },
          { x: 0, y: unit },
          { x: 0, y: 0 },
        ],
        [
          { x: 0, y: unit / 2 },
          { x: unit / 2, y: 0 },
          { x: unit, y: unit / 2 },
          { x: unit / 2, y: unit },
        ],
      ]

      const defaultFormation = [defaultPos, defaultPos, defaultPos, defaultPos]
      const current = formations[cycle] ?? defaultFormation
      const next = formations[(cycle + 1) % 4] ?? defaultFormation

      return [0, 1, 2, 3].map((i) => {
        const curr = current[i] ?? defaultPos
        const nxt = next[i] ?? defaultPos
        return {
          x: curr.x + (nxt.x - curr.x) * eased,
          y: curr.y + (nxt.y - curr.y) * eased,
        }
      })
    },
  },

  // ===== NEW PATTERNS =====

  // Counter Orbit - two pairs orbiting in opposite directions (inspired by orbit)
  counterOrbit: {
    name: 'Counter Orbit',
    description: 'Two pairs orbit in opposite directions',
    squareCount: 4,
    getPositions: (time: number, config: Config) => {
      const { size, gap, containerSize } = config
      const center = containerSize / 2 - size / 2
      const radius = (size + gap) / 2

      return [0, 1, 2, 3].map((i) => {
        const direction = i < 2 ? 1 : -1
        const offset = i % 2 === 0 ? 0 : Math.PI
        const angle = (time * 0.9 * direction + offset) % (Math.PI * 2)
        return {
          x: center + Math.cos(angle) * radius,
          y: center + Math.sin(angle) * radius,
        }
      })
    },
  },

  // Ellipse Orbit - squares follow elliptical paths (inspired by orbit)
  ellipse: {
    name: 'Ellipse',
    description: 'Squares orbit in elliptical paths',
    squareCount: 4,
    getPositions: (time: number, config: Config) => {
      const { size, gap, containerSize } = config
      const center = containerSize / 2 - size / 2
      const radiusX = (size + gap) / 1.5
      const radiusY = (size + gap) / 3

      return [0, 1, 2, 3].map((i) => {
        const angle = (time * 1.2 + (i * Math.PI) / 2) % (Math.PI * 2)
        const tilt = i % 2 === 0 ? 0 : Math.PI / 2
        return {
          x:
            center +
            Math.cos(angle) * radiusX * Math.cos(tilt) -
            Math.sin(angle) * radiusY * Math.sin(tilt),
          y:
            center +
            Math.cos(angle) * radiusX * Math.sin(tilt) +
            Math.sin(angle) * radiusY * Math.cos(tilt),
        }
      })
    },
  },

  // Diagonal Swap - pairs swap diagonally (inspired by shuffle)
  diagonalSwap: {
    name: 'Diagonal Swap',
    description: 'Pairs swap along diagonals',
    squareCount: 4,
    getPositions: (time: number, config: Config) => {
      const { corners } = config
      const cycle = Math.floor(time / 1.2) % 2
      const progress = (time % 1.2) / 1.2

      // Back-out easing for a nice overshoot effect
      const c1 = 1.70158
      const c3 = c1 + 1
      const eased = 1 + c3 * (progress - 1) ** 3 + c1 * (progress - 1) ** 2

      // Alternate between diagonal pairs
      const swaps =
        cycle === 0
          ? [
              [0, 2],
              [1, 3],
            ] // Main diagonal swap
          : [
              [0, 1],
              [2, 3],
            ] // Horizontal swap

      return [0, 1, 2, 3].map((i) => {
        const pairIndex = i < 2 ? 0 : 1
        const isFirst = i % 2 === 0
        const pair = swaps[pairIndex] ?? [0, 1]
        const [a, b] = pair
        const from = safeCorner(corners, isFirst ? a : b)
        const to = safeCorner(corners, isFirst ? b : a)

        return {
          x: from.x + (to.x - from.x) * eased,
          y: from.y + (to.y - from.y) * eased,
        }
      })
    },
  },

  // Cascade Shuffle - squares shuffle with staggered timing (inspired by shuffle)
  cascade: {
    name: 'Cascade',
    description: 'Staggered shuffle with wave timing',
    squareCount: 4,
    getPositions: (time: number, config: Config) => {
      const { corners } = config
      const cycleDuration = 2
      const cycle = Math.floor(time / cycleDuration)

      const shuffles = [
        [0, 1, 2, 3],
        [1, 0, 3, 2],
        [3, 2, 1, 0],
        [2, 3, 0, 1],
      ] as const

      return [0, 1, 2, 3].map((i) => {
        const stagger = i * 0.15
        const localProgress = Math.max(0, Math.min(1, ((time % cycleDuration) - stagger) / 0.6))
        const eased =
          localProgress < 0.5
            ? 2 * localProgress * localProgress
            : 1 - (-2 * localProgress + 2) ** 2 / 2

        const currentOrder = shuffles[cycle % shuffles.length] ?? [0, 1, 2, 3]
        const nextOrder = shuffles[(cycle + 1) % shuffles.length] ?? [0, 1, 2, 3]
        const from = safeCorner(corners, currentOrder[i])
        const to = safeCorner(corners, nextOrder[i])

        return {
          x: from.x + (to.x - from.x) * eased,
          y: from.y + (to.y - from.y) * eased,
        }
      })
    },
  },

  // Drop Bounce - gravity-inspired bounce (inspired by bounce)
  drop: {
    name: 'Drop',
    description: 'Squares drop with gravity bounce',
    squareCount: 3,
    getPositions: (time: number, config: Config) => {
      const { size, gap } = config
      const unit = size + gap

      return [0, 1, 2].map((i) => {
        const stagger = i * 0.3
        const localTime = (time + stagger) % 2

        // Bounce physics
        let y: number
        if (localTime < 0.5) {
          // Falling
          y = localTime * localTime * 4 * unit
        } else if (localTime < 1.5) {
          // Bouncing
          const bounceTime = localTime - 0.5
          const bounceHeight = unit * 0.6 * (1 - bounceTime)
          y = unit - Math.abs(Math.sin(bounceTime * Math.PI * 2)) * bounceHeight
        } else {
          // Settle
          y = unit
        }

        const xPositions = [0, unit / 2, unit]
        return {
          x: xPositions[i],
          y: Math.min(y, unit),
        }
      })
    },
  },

  // Springy Bounce - extra elastic movement (inspired by bounce)
  springy: {
    name: 'Springy',
    description: 'Extra springy elastic motion',
    squareCount: 4,
    getPositions: (time: number, config: Config) => {
      const { corners } = config
      const cycle = Math.floor(time / 1.8) % 4
      const progress = (time % 1.8) / 1.8

      // Spring easing with multiple oscillations
      const decay = Math.exp(-4 * progress)
      const oscillation = Math.cos(progress * Math.PI * 4)
      const eased = 1 - decay * oscillation * (1 - progress)

      const routes = [
        [0, 1, 2, 3],
        [1, 2, 3, 0],
        [2, 3, 0, 1],
        [3, 0, 1, 2],
      ] as const

      return [0, 1, 2, 3].map((i) => {
        const currentRoute = routes[cycle] ?? [0, 1, 2, 3]
        const nextRoute = routes[(cycle + 1) % 4] ?? [0, 1, 2, 3]
        const from = safeCorner(corners, currentRoute[i])
        const to = safeCorner(corners, nextRoute[i])

        return {
          x: from.x + (to.x - from.x) * eased,
          y: from.y + (to.y - from.y) * eased,
        }
      })
    },
  },

  // Morph Grid - smooth morphing between formations (inspired by gridShift)
  morph: {
    name: 'Morph',
    description: 'Smooth morphing grid formations',
    squareCount: 4,
    getPositions: (time: number, config: Config) => {
      const { size, gap, containerSize } = config
      const unit = size + gap
      const center = containerSize / 2 - size / 2
      const cycle = Math.floor(time / 1.8) % 5
      const progress = (time % 1.8) / 1.8

      // Smooth sine easing
      const eased = (1 - Math.cos(progress * Math.PI)) / 2

      const formations = [
        // Square
        [
          { x: 0, y: 0 },
          { x: unit, y: 0 },
          { x: unit, y: unit },
          { x: 0, y: unit },
        ],
        // Diamond
        [
          { x: center, y: 0 },
          { x: unit, y: center },
          { x: center, y: unit },
          { x: 0, y: center },
        ],
        // Line horizontal
        [
          { x: 0, y: center },
          { x: unit * 0.33, y: center },
          { x: unit * 0.66, y: center },
          { x: unit, y: center },
        ],
        // Line vertical
        [
          { x: center, y: 0 },
          { x: center, y: unit * 0.33 },
          { x: center, y: unit * 0.66 },
          { x: center, y: unit },
        ],
        // Tight center
        [
          { x: center - size / 4, y: center - size / 4 },
          { x: center + size / 4, y: center - size / 4 },
          { x: center + size / 4, y: center + size / 4 },
          { x: center - size / 4, y: center + size / 4 },
        ],
      ]

      const defaultForm = [defaultPos, defaultPos, defaultPos, defaultPos]
      const current = formations[cycle] ?? defaultForm
      const next = formations[(cycle + 1) % formations.length] ?? defaultForm

      return [0, 1, 2, 3].map((i) => {
        const curr = current[i] ?? defaultPos
        const nxt = next[i] ?? defaultPos
        return {
          x: curr.x + (nxt.x - curr.x) * eased,
          y: curr.y + (nxt.y - curr.y) * eased,
        }
      })
    },
  },

  // Stack Shift - vertical stacking motion (inspired by gridShift)
  stack: {
    name: 'Stack',
    description: 'Squares stack and unstack vertically',
    squareCount: 4,
    getPositions: (time: number, config: Config) => {
      const { size, gap } = config
      const unit = size + gap
      const smallGap = gap / 3
      const cycle = Math.floor(time / 1.4) % 4
      const progress = (time % 1.4) / 1.4
      const eased = 1 - (1 - progress) ** 4

      const formations = [
        // Grid
        [
          { x: 0, y: 0 },
          { x: unit, y: 0 },
          { x: 0, y: unit },
          { x: unit, y: unit },
        ],
        // Stack left
        [
          { x: 0, y: 0 },
          { x: 0, y: size + smallGap },
          { x: 0, y: (size + smallGap) * 2 },
          { x: 0, y: (size + smallGap) * 3 },
        ],
        // Line bottom
        [
          { x: 0, y: unit },
          { x: size + smallGap, y: unit },
          { x: (size + smallGap) * 2, y: unit },
          { x: (size + smallGap) * 3, y: unit },
        ],
        // Stack right
        [
          { x: unit, y: 0 },
          { x: unit, y: size + smallGap },
          { x: unit, y: (size + smallGap) * 2 },
          { x: unit, y: (size + smallGap) * 3 },
        ],
      ]

      const defaultForm = [defaultPos, defaultPos, defaultPos, defaultPos]
      const current = formations[cycle] ?? defaultForm
      const next = formations[(cycle + 1) % formations.length] ?? defaultForm

      return [0, 1, 2, 3].map((i) => {
        const curr = current[i] ?? defaultPos
        const nxt = next[i] ?? defaultPos
        return {
          x: curr.x + (nxt.x - curr.x) * eased,
          y: curr.y + (nxt.y - curr.y) * eased,
        }
      })
    },
  },
}

// Utility function to adjust color brightness
function adjustBrightness(hex: string, percent: number): string {
  if (hex.startsWith('hsl') || hex.startsWith('rgb')) return hex
  const num = Number.parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, Math.max(0, (num >> 16) + percent))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + percent))
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + percent))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

export function AnimatedSquares({
  pattern = 'chase',
  size = 24,
  gap = 8,
  color = '#3b82f6',
  uniformColor = false,
  speed = 1,
}: AnimatedSquaresProps) {
  const [time, setTime] = useState(0)
  const frameRef = useRef<number | undefined>(undefined)
  const startTimeRef = useRef<number>(Date.now())

  const patternConfig: Pattern = patterns[pattern] || patterns.chase
  const containerSize = size * 2 + gap

  const corners = {
    0: { x: 0, y: 0 },
    1: { x: size + gap, y: 0 },
    2: { x: size + gap, y: size + gap },
    3: { x: 0, y: size + gap },
  }

  const config = { size, gap, containerSize, corners }

  useEffect(() => {
    const animate = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000
      setTime(elapsed * speed)
      frameRef.current = requestAnimationFrame(animate)
    }

    frameRef.current = requestAnimationFrame(animate)
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [speed])

  const positions = patternConfig.getPositions(time, config)
  const squareCount = patternConfig.squareCount

  const shades = uniformColor
    ? Array(squareCount).fill(color)
    : Array(squareCount)
        .fill(0)
        .map((_, i) => adjustBrightness(color, -i * 15))

  // Create stable squares with IDs
  const squares = positions.map((pos, index) => ({
    id: `${pattern}-square-${index}`,
    position: pos,
    shade: shades[index],
  }))

  return (
    <div
      style={{
        position: 'relative',
        width: containerSize,
        height: containerSize,
      }}
    >
      {squares.map((square) => (
        <div
          key={square.id}
          style={{
            position: 'absolute',
            width: size,
            height: size,
            backgroundColor: square.shade,
            borderRadius: size * 0.15,
            transform: `translate(${square.position.x}px, ${square.position.y}px)`,
            transition: 'background-color 0.3s ease',
          }}
        />
      ))}
    </div>
  )
}
