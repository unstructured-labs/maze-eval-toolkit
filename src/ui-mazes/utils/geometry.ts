/**
 * Geometry utilities for maze operations
 */

import type { Box, Hallway, PerspectiveRotation } from '../types'

/**
 * Remap a direction based on perspective rotation.
 * When the viewer sees a rotated maze, pressing "UP" should move the player
 * in the direction that appears as "UP" from the viewer's perspective.
 *
 * - 90-right (clockwise): The maze is rotated 90° clockwise, so:
 *   - Viewer's UP → actual LEFT
 *   - Viewer's DOWN → actual RIGHT
 *   - Viewer's LEFT → actual DOWN
 *   - Viewer's RIGHT → actual UP
 *
 * - 180 (upside down): The maze is rotated 180°, so:
 *   - Viewer's UP → actual DOWN
 *   - Viewer's DOWN → actual UP
 *   - Viewer's LEFT → actual RIGHT
 *   - Viewer's RIGHT → actual LEFT
 *
 * - 90-left (counter-clockwise): The maze is rotated 90° counter-clockwise, so:
 *   - Viewer's UP → actual RIGHT
 *   - Viewer's DOWN → actual LEFT
 *   - Viewer's LEFT → actual UP
 *   - Viewer's RIGHT → actual DOWN
 */
export const remapDirection = (
  direction: 'up' | 'down' | 'left' | 'right',
  rotation: PerspectiveRotation,
): 'up' | 'down' | 'left' | 'right' => {
  if (rotation === 'none') return direction

  const mappings: Record<
    PerspectiveRotation,
    Record<'up' | 'down' | 'left' | 'right', 'up' | 'down' | 'left' | 'right'>
  > = {
    none: { up: 'up', down: 'down', left: 'left', right: 'right' },
    '90-right': { up: 'left', down: 'right', left: 'down', right: 'up' },
    '180': { up: 'down', down: 'up', left: 'right', right: 'left' },
    '90-left': { up: 'right', down: 'left', left: 'up', right: 'down' },
  }

  return mappings[rotation][direction]
}

/**
 * Get human-readable description of perspective rotation for display
 */
export const getPerspectiveRotationDescription = (rotation: PerspectiveRotation): string => {
  switch (rotation) {
    case '90-right':
      return 'The maze is rotated 90° clockwise. Your controls are remapped: UP moves left, LEFT moves down, and so on...'
    case '180':
      return 'The maze is rotated 180° (upside down). Your controls are remapped: UP moves down, RIGHT moves left, and so on...'
    case '90-left':
      return 'The maze is rotated 90° counter-clockwise. Your controls are remapped: UP moves right, LEFT moves up, and so on...'
    default:
      return ''
  }
}

// NOTE: posToKey is now re-exported from ../types (originally from @/core)
// Use: import { posToKey } from '../types'

/** Check if two bounding boxes overlap (with optional buffer around box1) */
export const doBoxesOverlap = (box1: Box, box2: Box, buffer = 0): boolean => {
  return (
    box1.x - buffer < box2.x + box2.width &&
    box1.x + box1.width + buffer > box2.x &&
    box1.y - buffer < box2.y + box2.height &&
    box1.y + box1.height + buffer > box2.y
  )
}

/** Get the bounding box for a hallway */
export const getHallwayBounds = (h: Hallway): Box => {
  return h.direction === 'horizontal'
    ? { x: h.x, y: h.y, width: h.length, height: h.width }
    : { x: h.x, y: h.y, width: h.width, height: h.length }
}
