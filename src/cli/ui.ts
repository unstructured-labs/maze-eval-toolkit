/**
 * UI command - starts both the Hono API server and Vite dev server
 */

import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { Command } from 'commander'

export const uiCommand = new Command('ui')
  .description('Start the UI development server with API backend')
  .action(async () => {
    const rootDir = resolve(import.meta.dirname, '../..')

    console.log('Starting API server and UI...\n')

    // Start Hono server
    const server = spawn('bun', ['run', 'src/server/index.ts'], {
      cwd: rootDir,
      stdio: 'inherit',
    })

    // Start Vite
    const vite = spawn('bunx', ['--bun', 'vite', '--config', 'src/ui/vite.config.ts'], {
      cwd: rootDir,
      stdio: 'inherit',
    })

    // Handle process termination
    const cleanup = () => {
      server.kill()
      vite.kill()
      process.exit(0)
    }

    process.on('SIGINT', cleanup)
    process.on('SIGTERM', cleanup)

    // Wait for either process to exit
    await Promise.race([
      new Promise((_, reject) =>
        server.on('exit', (code) => reject(new Error(`Server exited with code ${code}`))),
      ),
      new Promise((_, reject) =>
        vite.on('exit', (code) => reject(new Error(`Vite exited with code ${code}`))),
      ),
    ]).catch((err) => {
      console.error(err.message)
      cleanup()
    })
  })
