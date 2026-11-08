import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/steamboiler/',
  plugins: [react()],
  test: {
    // Long headless scenarios exceed vitest's 5s default under coverage instrumentation
    testTimeout: 30_000,
    // Count every source file, not only the ones a test happens to import
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}', 'sim/**/*.ts', 'scripts/**/*.ts'],
      exclude: ['**/*.test.{ts,tsx}', '**/*.d.ts', 'src/main.tsx', 'scripts/roadmap.ts', 'sim/run.ts', 'sim/serve.ts', 'sim/write-snapshots.ts', 'sim/perf/**', 'sim/reports/**', 'sim/snapshots/**'],
    },
    // Test layers (docs/dev/testing.md): unit is everything outside the scenario directories;
    // the speed guard in sim/perf/ is opt-in (vitest.perf.config.ts)
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
