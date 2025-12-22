/**
 * Type definitions for the Maze Game
 *
 * Shared types are re-exported from @/core for consistency.
 * UI-only types are defined here.
 */

// Re-export shared types from core
export {
  type Cell,
  type Difficulty,
  DIFFICULTIES,
  type MazeStats,
  type MoveAction,
  type Position,
  type RequiredMove,
  type RequirementType,
  posToKey,
  keyToPos,
} from '@/core'

import type { Cell } from '@/core'

// ============================================================================
// UI-Only Types
// ============================================================================

/**
 * Mutable cell used during maze generation (extends core Cell with visited flag)
 */
export interface MutableCell extends Cell {
  visited: boolean
}

/**
 * Perspective rotation: the viewer sees the maze rotated, so controls are remapped
 */
export type PerspectiveRotation = 'none' | '90-right' | '180' | '90-left'

export type Room = { x: number; y: number; width: number; height: number }
export type Obstacle = { x: number; y: number; width: number; height: number }
export type Hallway = {
  x: number
  y: number
  length: number
  width: number
  direction: 'horizontal' | 'vertical'
}
export type Box = { x: number; y: number; width: number; height: number }
export type Hole = { x: number; y: number; width: number; height: number }

/**
 * Portal represents an exit/entrance on the maze boundary
 */
export type Portal = {
  x: number
  y: number
  side: 'top' | 'bottom' | 'left' | 'right'
}

/**
 * Exit door pair: walking through one teleports to the other
 */
export type ExitDoorPair = {
  portal1: Portal
  portal2: Portal
}

/**
 * Wildcard tile: a special movable tile that the player can pass through
 */
export type WildcardTile = { x: number; y: number } | null

/**
 * UI-specific difficulty settings (extends core with UI-only fields)
 */
export type DifficultySettings = {
  minWidth: number
  maxWidth: number
  minHeight: number
  maxHeight: number
  visionRadius: number
  extraPaths: number
  label: string
  skipFeatures?: boolean
}

export type ExecutionMode = 'fullSolution' | 'moveByMove'

export interface PromptViewOptions {
  ascii: boolean
  adjacencyList: boolean
  coordinateMatrix: boolean
  matrix2D: boolean
  blockFormat: boolean
  explicitEdges: boolean
  coordinateToken: boolean
  includeUnreachableInstructions: boolean
  applyTimePressure: boolean
  executionMode: ExecutionMode
}

export interface MoveByMoveContext {
  startPos: { x: number; y: number }
  currentPos: { x: number; y: number }
  moveHistory: Array<'UP' | 'DOWN' | 'LEFT' | 'RIGHT'>
}
