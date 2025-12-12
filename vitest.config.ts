import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'dist',
        'node_modules',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.config.ts',
        '**/__tests__/**',
        '**/__fixtures__/**'
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90
      },
      all: true,
      clean: true
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    reporters: ['verbose'],
    watchExclude: ['node_modules', 'dist']
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});