/**
 * Difficulty level configurations
 */

import type { Difficulty, DifficultyConfig } from './types'

/**
 * Settings for each difficulty level
 *
 * - Grid sizes increase with difficulty
 * - extraPaths: Random wall removals that create alternative routes (more = easier)
 * - minShortestPath: Minimum required path length from start to goal
 */
export const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultyConfig> = {
  simple: {
    minWidth: 5,
    maxWidth: 8,
    minHeight: 4,
    maxHeight: 6,
    extraPaths: 0,
    minShortestPath: 5,
    label: 'Simple',
  },
  easy: {
    minWidth: 8,
    maxWidth: 12,
    minHeight: 6,
    maxHeight: 9,
    extraPaths: 6,
    minShortestPath: 10,
    label: 'Easy',
  },
  medium: {
    minWidth: 12,
    maxWidth: 18,
    minHeight: 10,
    maxHeight: 14,
    extraPaths: 10,
    minShortestPath: 20,
    label: 'Medium',
  },
  hard: {
    minWidth: 16,
    maxWidth: 22,
    minHeight: 12,
    maxHeight: 16,
    extraPaths: 15,
    minShortestPath: 30,
    label: 'Hard',
  },
  nightmare: {
    minWidth: 28,
    maxWidth: 38,
    minHeight: 18,
    maxHeight: 22,
    extraPaths: 5,
    minShortestPath: 50,
    label: 'Nightmare',
  },
  horror: {
    minWidth: 35,
    maxWidth: 50,
    minHeight: 20,
    maxHeight: 30,
    extraPaths: 3,
    minShortestPath: 100,
    label: 'Horror',
  },
}

/**
 * Get the configuration for a difficulty level
 */
export function getDifficultyConfig(difficulty: Difficulty): DifficultyConfig {
  return DIFFICULTY_SETTINGS[difficulty]
}

/**
 * Generate a random dimension within the difficulty's range
 */
export function randomDimension(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
