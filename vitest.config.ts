import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/testSetup.ts'],
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'scripts/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}',
    ],
    coverage: {
      reporter: ['text', 'json', 'html', 'json-summary'],
      thresholds: {
        'src/utils/**': { statements: 80, branches: 70, functions: 70 },
        'src/hooks/**': { statements: 70, branches: 60, functions: 70 },
        'src/features/**/hooks/**': { statements: 60, branches: 50, functions: 60 },
        'src/features/**/api/**': { statements: 50, branches: 40, functions: 50 }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
