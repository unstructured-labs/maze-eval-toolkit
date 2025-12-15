import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname),
  resolve: {
    alias: {
      '@': resolve(__dirname, '..'),
    },
  },
  server: {
    port: 5173,
  },
})
