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
      // Phase 4 baseline thresholds — to be raised incrementally each phase.
      // Global thresholds disabled — most code is untestable React pages.
      // Strategy: enforce meaningful coverage on pure logic layers (utils, api, hooks, contexts).
      thresholds: {
        // Global baseline: 380 source files, 44 test files — realistic starting threshold.
        // Target Phase 6: raise to 70/65/70/70.
        statements: 60,
        branches: 55,
        functions: 60,
        lines: 60,

        // Phase 4 baseline: 82%+ statements/lines, 90%+ branches achieved via new tests.
        // functions at 65% — remaining untested fns are Sentry/Web Vitals/metrics wrappers (excluded or untestable).
        'src/utils/**': {
          statements: 82,
          branches: 88,
          functions: 64,
          lines: 82,
        },
        // Phase 4 baseline: api layer has large auto-generated query surface.
        // Target Phase 5: raise to 40/30/40/40.
        'src/features/**/api/**': {
          statements: 28,
          branches: 20,
          functions: 30,
          lines: 30,
        },
        // Phase 4 baseline: hooks tested for new ones in this phase.
        // Target Phase 5: raise to 60/50/65/60.
        'src/hooks/**': {
          statements: 46,
          branches: 32,
          functions: 60,
          lines: 45,
        },
        // Phase 4 baseline: AuthContext well covered, ThemeContext partially.
        // Target Phase 5: raise branches to 50.
        'src/contexts/**': {
          statements: 68,
          branches: 38,
          functions: 70,
          lines: 70,
        },
        // Phase 4 baseline: feature hooks are large and many are Supabase-dependent.
        // Target Phase 5: raise to 35/20/30/35.
        'src/features/**/hooks/**': {
          statements: 24,
          branches: 12,
          functions: 20,
          lines: 26,
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
