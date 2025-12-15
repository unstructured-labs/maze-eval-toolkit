/**
 * Drizzle ORM schema for the evaluations database
 * Used for drizzle-kit studio inspection
 */

import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const evaluations = sqliteTable(
  'evaluations',
  {
    id: text('id').primaryKey(),
    runId: text('run_id').notNull(),
    testSetId: text('test_set_id').notNull(),
    mazeId: text('maze_id').notNull(),
    model: text('model').notNull(),
    difficulty: text('difficulty').notNull(),

    // Request details
    prompt: text('prompt').notNull(),
    promptFormats: text('prompt_formats').notNull(),
    startedAt: text('started_at').notNull(),
    completedAt: text('completed_at').notNull(),

    // Token usage
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    reasoningTokens: integer('reasoning_tokens'),

    // Cost and timing
    costUsd: real('cost_usd'),
    inferenceTimeMs: integer('inference_time_ms').notNull(),

    // Response data
    rawResponse: text('raw_response').notNull(),
    parsedMoves: text('parsed_moves'),
    reasoning: text('reasoning'),

    // Outcome
    outcome: text('outcome').notNull(),
    movesExecuted: integer('moves_executed'),
    finalPosition: text('final_position'),

    // Efficiency
    solutionLength: integer('solution_length'),
    shortestPath: integer('shortest_path').notNull(),
    efficiency: real('efficiency'),
  },
  (table) => [
    index('idx_evaluations_run').on(table.runId),
    index('idx_evaluations_model').on(table.model),
    index('idx_evaluations_maze').on(table.mazeId),
    index('idx_evaluations_outcome').on(table.outcome),
    index('idx_evaluations_test_set').on(table.testSetId),
    index('idx_evaluations_difficulty').on(table.difficulty),
  ],
)
