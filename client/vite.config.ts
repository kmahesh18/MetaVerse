import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Load .env from parent directory (root of monorepo)
  envDir: path.resolve(__dirname, '..'),
})
