import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base:  './', // for a project-site deploy
  plugins: [react()],
  test: {
    // Long headless scenarios exceed vitest's 5s default under coverage instrumentation
    testTimeout: 30_000,
  },
})
