/**
 * Migration script to add run_id column to existing evaluations table
 *
 * Run with: bun run scripts/migrate-add-run-id.ts
 */

import { Database } from 'bun:sqlite'
import { v4 as uuidv4 } from 'uuid'

const DB_PATH = './results/eval.db'

console.log('Opening database...')
const db = new Database(DB_PATH)

// Check if run_id column already exists
const tableInfo = db.query('PRAGMA table_info(evaluations)').all() as Array<{ name: string }>
const hasRunId = tableInfo.some((col) => col.name === 'run_id')

if (hasRunId) {
  console.log('run_id column already exists. Skipping migration.')
  db.close()
  process.exit(0)
}

console.log('Adding run_id column...')

// Add the column (SQLite doesn't support NOT NULL for new columns with existing data)
db.run('ALTER TABLE evaluations ADD COLUMN run_id TEXT')

// Get distinct models to assign run_ids
const models = db.query('SELECT DISTINCT model FROM evaluations').all() as Array<{ model: string }>

console.log(`Found ${models.length} distinct models:`)
for (const { model } of models) {
  const runId = uuidv4()
  console.log(`  ${model} -> ${runId}`)

  // Update all evaluations for this model with the same run_id
  db.run('UPDATE evaluations SET run_id = ? WHERE model = ?', [runId, model])
}

// Create index for run_id
console.log('Creating index...')
db.run('CREATE INDEX IF NOT EXISTS idx_evaluations_run ON evaluations(run_id)')

// Verify migration
const nullCount = db
  .query('SELECT COUNT(*) as count FROM evaluations WHERE run_id IS NULL')
  .get() as { count: number }
if (nullCount.count > 0) {
  console.error(`ERROR: ${nullCount.count} rows still have NULL run_id`)
  process.exit(1)
}

console.log('Migration complete!')
db.close()
