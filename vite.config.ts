import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // The existing logo is stored in the repository-level assets/ directory.
  // Treat it as Vite's public directory so it is copied to dist/logo.svg.
  publicDir: 'assets',
  base: '/Personal_Expert_AI_Web/',
})
