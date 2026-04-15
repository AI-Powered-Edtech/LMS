import { test, expect } from '@playwright/test'

const STUDENT_EMAIL = 'student@edusync.dev'
const STUDENT_PASSWORD = 'password123'

test.describe('Student Journey — Login to Quiz', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/login')
  })

  test('student dapat login dan melihat dashboard', async ({ page }) => {
    const quickLogin = page.locator('[data-testid="quick-login-student"], button:has-text("Student")')
    if (await quickLogin.isVisible({ timeout: 2000 }).catch(() => false)) {
      await quickLogin.click()
    } else {
      await page.fill('input[type="email"]', STUDENT_EMAIL)
      await page.fill('input[type="password"]', STUDENT_PASSWORD)
      await page.click('button[type="submit"]')
    }
    await page.waitForURL(/dashboard|student/, { timeout: 10000 })
    await expect(page).not.toHaveURL(/login/)
  })

  test('student dapat membuka halaman kursus', async ({ page }) => {
    const quickLogin = page.locator('[data-testid="quick-login-student"], button:has-text("Student")')
    if (await quickLogin.isVisible({ timeout: 2000 }).catch(() => false)) {
      await quickLogin.click()
    } else {
      await page.fill('input[type="email"]', STUDENT_EMAIL)
      await page.fill('input[type="password"]', STUDENT_PASSWORD)
      await page.click('button[type="submit"]')
    }
    await page.waitForURL(/dashboard|student/, { timeout: 10000 })
    await page.goto('/#/app/student/courses')
    await page.waitForLoadState('networkidle')
    const hasContent = await page.locator('h1, h2, [data-testid="courses-list"], [data-testid="empty-state"]')
      .isVisible({ timeout: 8000 })
    expect(hasContent).toBeTruthy()
  })

  test('student dapat melihat leaderboard', async ({ page }) => {
    const quickLogin = page.locator('[data-testid="quick-login-student"], button:has-text("Student")')
    if (await quickLogin.isVisible({ timeout: 2000 }).catch(() => false)) {
      await quickLogin.click()
    } else {
      await page.fill('input[type="email"]', STUDENT_EMAIL)
      await page.fill('input[type="password"]', STUDENT_PASSWORD)
      await page.click('button[type="submit"]')
    }
    await page.waitForURL(/dashboard|student/, { timeout: 10000 })
    await page.goto('/#/app/student/leaderboard')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1, h2')).toBeVisible({ timeout: 8000 })
  })
})
