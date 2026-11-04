import { defineConfig } from 'vitest/config'

// Runner speed guard (docs/dev/testing.md): its own config, so a plain `vitest run`, with or without coverage, skips it
export default defineConfig({
  test: {
    include: ['sim/perf/**/*.test.ts'],
    testTimeout: 30_000,
  },
})
