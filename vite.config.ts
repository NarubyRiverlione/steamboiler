import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const UI_TESTS: string[] = ['src/components/**/*.test.tsx', 'src/navigation/**/*.test.tsx']

// https://vite.dev/config/
export default defineConfig({
  base: '/steamboiler/',
  plugins: [react()],
  test: {
    // Long headless scenarios exceed vitest's 5s default under coverage instrumentation
    testTimeout: 30_000,
    // Test layers (docs/dev/testing.md): unit is everything outside the scenario directories;
    // the speed guard in sim/perf/ is opt-in (vitest.perf.config.ts)
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.test.{ts,tsx}', 'sim/*.test.ts', 'scripts/**/*.test.ts'],
          exclude: [...configDefaults.exclude, ...UI_TESTS],
        },
      },
      // Behaviour of the board components (jsdom): an action is dispatched, a tile lights from a flag
      { extends: true, test: { name: 'ui', environment: 'jsdom', globals: true, include: UI_TESTS } },
      { extends: true, test: { name: 'golden', include: ['sim/golden/**/*.test.ts'] } },
      { extends: true, test: { name: 'edge', include: ['sim/edge/**/*.test.ts'] } },
    ],
  },
})
