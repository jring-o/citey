import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/match/**'],
      thresholds: {
        'src/match/**': {
          lines: 100,
        },
      },
    },
  },
});
