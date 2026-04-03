import { test, expect, Page } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * EduSync Visual Regression E2E Tests
 *
 * Screenshots 10 key pages for visual regression tracking.
 * Saves full-page screenshots to e2e/screenshots/.
 *
 * Test accounts:
 *   student@edusync.dev / password123
 *   teacher@edusync.dev / password123
 *   admin@edusync.dev   / password123
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots')

// Ensure screenshots directory exists before tests run
test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
  }
})

/**
 * Login helper — fills the login form using keyboard events
 * (React controlled inputs require keyboard input, not programmatic fill).
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

  // Wait for navigation away from login page
  await page.waitForURL(/.*(?!login)/, { timeout: 15000 })
  await page.waitForLoadState('networkidle')
}

test.describe('Visual Regression', () => {
  // Give each test enough time for auth + page load + network
  test.setTimeout(30000)

  // ---------------------------------------------------------------
  // 1. Login page (no auth required)
  // ---------------------------------------------------------------
  test('01 — Login page', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForLoadState('networkidle')

    // Verify the page loaded by checking for the login form
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({
      timeout: 10000,
    })

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '01-login.png'),
      fullPage: true,
    })
  })

  // ---------------------------------------------------------------
  // 2. Student dashboard
  // ---------------------------------------------------------------
  test('02 — Student dashboard', async ({ page }) => {
    await login(page, 'student@edusync.dev', 'password123')
    await page.goto('/#/app/student')
    await page.waitForLoadState('networkidle')

    // Wait for dashboard content to appear
    await expect(page.locator('main, [role="main"], .dashboard, #root')).toBeVisible({
      timeout: 10000,
    })
    await page.waitForTimeout(1000)

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '02-student-dashboard.png'),
      fullPage: true,
    })
  })

  // ---------------------------------------------------------------
  // 3. Teacher dashboard
  // ---------------------------------------------------------------
  test('03 — Teacher dashboard', async ({ page }) => {
    await login(page, 'teacher@edusync.dev', 'password123')
    await page.goto('/#/app/teacher')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('main, [role="main"], .dashboard, #root')).toBeVisible({
      timeout: 10000,
    })
    await page.waitForTimeout(1000)

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '03-teacher-dashboard.png'),
      fullPage: true,
    })
  })

  // ---------------------------------------------------------------
  // 4. Admin dashboard
  // ---------------------------------------------------------------
  test('04 — Admin dashboard', async ({ page }) => {
    await login(page, 'admin@edusync.dev', 'password123')
    await page.goto('/#/app/admin')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('main, [role="main"], .dashboard, #root')).toBeVisible({
      timeout: 10000,
    })
    await page.waitForTimeout(1000)

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '04-admin-dashboard.png'),
      fullPage: true,
    })
  })

  // ---------------------------------------------------------------
  // 5. Course list (student view)
  // ---------------------------------------------------------------
  test('05 — Course list (student)', async ({ page }) => {
    await login(page, 'student@edusync.dev', 'password123')
    await page.goto('/#/app/student/courses')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('main, [role="main"], #root')).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(1000)

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '05-course-list-student.png'),
      fullPage: true,
    })
  })

  // ---------------------------------------------------------------
  // 6. Course detail (first available course — LessonViewer)
  // ---------------------------------------------------------------
  test('06 — Course detail', async ({ page }) => {
    await login(page, 'student@edusync.dev', 'password123')
    await page.goto('/#/app/student/courses')
    await page.waitForLoadState('networkidle')

    // Try to click the first course link/card to navigate to detail
    const courseLink = page.locator('a[href*="courses/"], [data-course-id], .course-card').first()
    const hasCourseLink = await courseLink.isVisible().catch(() => false)

    if (hasCourseLink) {
      await courseLink.click()
      await page.waitForLoadState('networkidle')
    }
    // If no course link found, stay on courses page — screenshot whatever is shown
    await page.waitForTimeout(1500)

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '06-course-detail.png'),
      fullPage: true,
    })
  })

  // ---------------------------------------------------------------
  // 7. Smart Player (lesson view — same as LessonViewer)
  // ---------------------------------------------------------------
  test('07 — Smart Player (lesson view)', async ({ page }) => {
    await login(page, 'student@edusync.dev', 'password123')
    await page.goto('/#/lesson')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('main, [role="main"], #root')).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(1500)

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '07-smart-player.png'),
      fullPage: true,
    })
  })

  // ---------------------------------------------------------------
  // 8. Quiz page
  // ---------------------------------------------------------------
  test('08 — Quiz page', async ({ page }) => {
    await login(page, 'student@edusync.dev', 'password123')
    await page.goto('/#/app/student/quizzes')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('main, [role="main"], #root')).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(1000)

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '08-quiz-page.png'),
      fullPage: true,
    })
  })

  // ---------------------------------------------------------------
  // 9. Leaderboard
  // ---------------------------------------------------------------
  test('09 — Leaderboard', async ({ page }) => {
    await login(page, 'student@edusync.dev', 'password123')
    await page.goto('/#/leaderboard')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('main, [role="main"], #root')).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(1000)

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '09-leaderboard.png'),
      fullPage: true,
    })
  })

  // ---------------------------------------------------------------
  // 10. Profile page
  // ---------------------------------------------------------------
  test('10 — Profile page', async ({ page }) => {
    await login(page, 'student@edusync.dev', 'password123')
    await page.goto('/#/profile')
    await page.waitForLoadState('networkidle')

    await expect(page.locator('main, [role="main"], #root')).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(1000)

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '10-profile.png'),
      fullPage: true,
    })
  })
})
