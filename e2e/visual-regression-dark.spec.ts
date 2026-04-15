import { test, expect, Page } from '@playwright/test'

/**
 * EduSync Visual Regression E2E Tests - DARK MODE
 *
 * Run with: npx playwright test e2e/visual-regression-dark.spec.ts --project=visual
 */

async function login(page: Page, email: string, password: string) {
  await page.goto('/#/login')
  await page.waitForLoadState('networkidle')

  const emailInput = page.locator('input[type="email"], input[name="email"]')
  await emailInput.waitFor({ state: 'visible', timeout: 10000 })
  await emailInput.click()
  await emailInput.fill(email)

  const passwordInput = page.locator('input[type="password"], input[name="password"]')
  await passwordInput.waitFor({ state: 'visible', timeout: 5000 })
  await passwordInput.click()
  await passwordInput.fill(password)

  await page.locator('button[type="submit"]').first().click()
  await page.waitForURL(/.*(?!login)/, { timeout: 15000 })
  await page.waitForLoadState('networkidle')
}

test.describe('Visual Regression - Dark Mode', () => {
  test.setTimeout(30000)

  // Force dark mode before each test
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('theme', 'dark')
      document.documentElement.classList.add('dark')
    })
  })

  test('01 — Login page (Dark)', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page).toHaveScreenshot('01-login-dark.png', { fullPage: true })
  })

  test('02 — Student dashboard (Dark)', async ({ page }) => {
    await login(page, 'student@edusync.dev', 'password123')
    await page.goto('/#/app/student')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main')).toBeVisible()
    await page.waitForTimeout(1000)
    await expect(page).toHaveScreenshot('02-student-dashboard-dark.png', { fullPage: true })
  })

  test('03 — Analytics Page (Dark)', async ({ page }) => {
    await login(page, 'teacher@edusync.dev', 'password123')
    await page.goto('/#/app/teacher/analytics')
    await page.waitForLoadState('networkidle')

    // Wait for Recharts to render
    await page.waitForSelector('.recharts-surface', { timeout: 10000 })
    await page.waitForTimeout(1000)

    await expect(page).toHaveScreenshot('03-analytics-dark.png', { fullPage: true })
  })

  test('04 — Quiz page (Dark)', async ({ page }) => {
    await login(page, 'student@edusync.dev', 'password123')
    await page.goto('/#/app/student/quizzes')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main')).toBeVisible()
    await page.waitForTimeout(1000)
    await expect(page).toHaveScreenshot('04-quiz-page-dark.png', { fullPage: true })
  })
})
