import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname),
  resolve: {
    alias: {
      '@': resolve(__dirname, '..'),
    },
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss({ config: resolve(__dirname, 'tailwind.config.js') }),
        autoprefixer(),
      ],
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
