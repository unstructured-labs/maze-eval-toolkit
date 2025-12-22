/**
 * Maze Storage Utilities - localStorage persistence for saved maze designs
 */

import type { Cell, Difficulty, Position } from '../types'

export interface SavedMazeDesign {
  name: string
  savedAt: number
  difficulty: Difficulty
  width: number
  height: number
  grid: Cell[][]
  start: Position
  goal: Position
  requirementType: 'REQUIRED_SUBSEQUENCE' | 'REQUIRED_TILES' | null
  requiredSolutionSubsequences?: Array<
    Array<{ move: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'; position: Position }>
  >
  shortestPathPlaythrough?: Array<{ move: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'; position: Position }>
  requiredTiles?: Position[]
  specialInstructions?: string
}

const MAZE_DESIGNS_STORAGE_KEY = 'maze_designs'

/**
 * Get all saved mazes as an object keyed by name
 */
export function getSavedMazes(): Record<string, SavedMazeDesign> {
  if (typeof window === 'undefined') return {}
  const saved = localStorage.getItem(MAZE_DESIGNS_STORAGE_KEY)
  return saved ? JSON.parse(saved) : {}
}

/**
 * Get saved mazes as a sorted array (newest first)
 */
export function getSavedMazesList(): SavedMazeDesign[] {
  const mazes = getSavedMazes()
  return Object.values(mazes).sort((a, b) => b.savedAt - a.savedAt)
}

/**
 * Save a maze design to localStorage
 */
export function saveMaze(design: SavedMazeDesign): void {
  if (typeof window === 'undefined') return
  const mazes = getSavedMazes()
  mazes[design.name] = design
  localStorage.setItem(MAZE_DESIGNS_STORAGE_KEY, JSON.stringify(mazes))
}

/**
 * Load a maze design by name
 */
export function loadMaze(name: string): SavedMazeDesign | null {
  const mazes = getSavedMazes()
  return mazes[name] ?? null
}

/**
 * Delete a maze design by name
 */
export function deleteMaze(name: string): void {
  if (typeof window === 'undefined') return
  const mazes = getSavedMazes()
  delete mazes[name]
  localStorage.setItem(MAZE_DESIGNS_STORAGE_KEY, JSON.stringify(mazes))
}

/**
 * Check if a maze with the given name exists
 */
export function mazeExists(name: string): boolean {
  const mazes = getSavedMazes()
  return name in mazes
}
