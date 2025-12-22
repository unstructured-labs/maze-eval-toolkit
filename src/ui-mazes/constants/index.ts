/**
 * Constants for the Maze Game
 */

import type { Difficulty, DifficultySettings } from '../types'

export const CELL_SIZE = 26

export const MIN_SHORTEST_PATH_FOR_REGENERATION = 15

export const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultySettings> = {
  simple: {
    minWidth: 5,
    maxWidth: 8,
    minHeight: 4,
    maxHeight: 6,
    visionRadius: Number.POSITIVE_INFINITY,
    extraPaths: 0,
    label: 'Simple',
    skipFeatures: true,
  },
  easy: {
    minWidth: 8,
    maxWidth: 12,
    minHeight: 6,
    maxHeight: 9,
    visionRadius: Number.POSITIVE_INFINITY,
    extraPaths: 6,
    label: 'Easy',
  },
  medium: {
    minWidth: 12,
    maxWidth: 18,
    minHeight: 10,
    maxHeight: 14,
    visionRadius: 4,
    extraPaths: 10,
    label: 'Medium',
  },
  hard: {
    minWidth: 16,
    maxWidth: 22,
    minHeight: 12,
    maxHeight: 16,
    visionRadius: 3,
    extraPaths: 15,
    label: 'Hard',
  },
  nightmare: {
    minWidth: 28,
    maxWidth: 38,
    minHeight: 18,
    maxHeight: 22,
    visionRadius: 2,
    extraPaths: 0,
    label: 'Nightmare',
  },
  horror: {
    minWidth: 40,
    maxWidth: 50,
    minHeight: 24,
    maxHeight: 30,
    visionRadius: 1,
    extraPaths: 0,
    label: 'Horror',
  },
}
