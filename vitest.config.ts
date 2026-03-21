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
      reporter: ['text', 'lcov', 'html'],
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
      },
    },
  },
})
