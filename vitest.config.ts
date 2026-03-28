import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    globals: true,
    exclude: ['**/node_modules/**', '**/e2e/**', '**/tests/**', '**/.claude/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/setupTests.ts',
        'src/**/__tests__/**',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        // Browser-API/PWA utilities — require IndexedDB, Sentry SDK, service worker, or
        // web-vitals APIs; cannot be meaningfully unit-tested without complex browser mocks
        'src/utils/backgroundSync.ts',
        'src/utils/offlineStorage.ts',
        'src/utils/sentry.ts',
        'src/utils/webVitals.ts',
        'src/utils/prefetch.ts',
        'src/utils/metrics.ts',
      ],
      // Phase 1: Scoped thresholds per directory
      // Global thresholds disabled — most code is untestable React pages
      // Enforce meaningful coverage on logic layers (utils, services, features/api)
      thresholds: {
        'src/utils/**': {
          statements: 80,
          branches: 70,
          functions: 70,
          lines: 80,
        },
        'src/features/**/api/**': {
          statements: 50,
          branches: 40,
          functions: 50,
          lines: 50,
        },
        'src/hooks/**': {
          statements: 70,
          branches: 60,
          functions: 70,
          lines: 70,
        },
        'src/contexts/**': {
          statements: 60,
          branches: 50,
          functions: 60,
          lines: 60,
        },
        'src/features/**/hooks/**': {
          statements: 60,
          branches: 50,
          functions: 60,
          lines: 60,
        },
      },
    },
  },
})
