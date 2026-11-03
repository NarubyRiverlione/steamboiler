import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/steamboiler/',
  plugins: [react()],
  test: {
    // Long headless scenarios exceed vitest's 5s default under coverage instrumentation
    testTimeout: 30_000,
    // Test layers (docs/dev/testing.md): unit is everything outside the two scenario directories
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.test.{ts,tsx}', 'sim/*.test.ts', 'scripts/**/*.test.ts'],
        },
      },
      { extends: true, test: { name: 'golden', include: ['sim/golden/**/*.test.ts'] } },
      { extends: true, test: { name: 'edge', include: ['sim/edge/**/*.test.ts'] } },
    ],
  },
})
