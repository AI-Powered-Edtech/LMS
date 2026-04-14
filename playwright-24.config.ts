import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/flows24',
  fullyParallel: false,
  workers: 1, // Single worker prevents DDOSing Supabase Nano Free Tier
  retries: 1,
  reporter: 'html',
  timeout: 120000,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'student',
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/student.json' },
      dependencies: ['setup'],
    },
    {
      name: 'teacher',
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/teacher.json' },
      dependencies: ['setup'],
    },
    {
      name: 'admin',
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/admin.json' },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
})
