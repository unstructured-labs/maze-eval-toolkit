/**
 * SQLite database client using Bun's native SQLite
 */

import { Database } from 'bun:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { CREATE_EVALUATIONS_TABLE, CREATE_INDEXES } from './schema'

let db: Database | null = null

/**
 * Initialize the database connection
 */
export function initDatabase(dbPath: string): Database {
  // Ensure directory exists
  const dir = dirname(dbPath)
  mkdirSync(dir, { recursive: true })

  // Create or open database
  db = new Database(dbPath)

  // Enable WAL mode for better performance
  db.run('PRAGMA journal_mode = WAL')

  // Create tables
  db.run(CREATE_EVALUATIONS_TABLE)
  db.run(CREATE_INDEXES)

  return db
}

/**
 * Get the current database connection
 */
export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
