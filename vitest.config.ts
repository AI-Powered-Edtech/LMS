import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
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
        'src/hooks/usePWA.ts',
        'src/hooks/usePWAInstall.ts',
        // Browser-API/PWA utilities — require IndexedDB, Sentry SDK, service worker, or
        // web-vitals APIs; cannot be meaningfully unit-tested without complex browser mocks
        'src/utils/backgroundSync.ts',
        'src/utils/offlineStorage.ts',
        'src/utils/sentry.ts',
        'src/utils/webVitals.ts',
        'src/utils/prefetch.ts',
        'src/utils/metrics.ts',
      ],
      thresholds: {
        'src/utils/**': {
          statements: 65,
          branches: 65,
          functions: 50,
          lines: 65,
        },
        'src/features/**/api/**': {
          statements: 22,
          branches: 15,
          functions: 24,
          lines: 24,
        },
        // SECURITY CRITICAL: Auth guards must have high test coverage.
        // These files protect multi-tenant isolation and cross-tenant privilege escalation.
        'src/components/guards/**': {
          statements: 85,
          branches: 80,
          functions: 85,
          lines: 85,
        },
        // Sanitization utilities must be thoroughly tested — XSS prevention depends on them.
        'src/utils/sanitize.ts': {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
      },
    },
  },
})
