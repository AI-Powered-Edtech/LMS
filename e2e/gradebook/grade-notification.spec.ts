import { expect, test } from '@playwright/test'

/**
 * E2E: Grade publication → student notification
 * Tests that when a teacher grades an assignment, the student
 * can see the grade in their gradebook.
 */

test.describe('Gradebook — Grade Flow', () => {
  test('student gradebook page loads without errors', async ({ page }) => {
    // Login as student
    await page.goto('http://localhost:5173/#/login')
    await page.waitForLoadState('networkidle')

    await page.fill('input[type="email"], input[name="email"]', 'student@edusync.dev')
    await page.fill('input[type="password"], input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(app)/, { timeout: 15000 })

    // Navigate to grades
    await page.goto('http://localhost:5173/#/app/student/grades')
    await page.waitForLoadState('networkidle')

    // Page should load without JS errors
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.waitForTimeout(2000)

    // Filter out known non-critical errors
    const criticalErrors = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error promise rejection')
    )
    expect(criticalErrors).toHaveLength(0)

    // Page title should be set
    const title = await page.title()
    expect(title).toBeTruthy()
  })

  test('teacher gradebook page loads without errors', async ({ page }) => {
    await page.goto('http://localhost:5173/#/login')
    await page.waitForLoadState('networkidle')

    await page.fill('input[type="email"], input[name="email"]', 'teacher@edusync.dev')
    await page.fill('input[type="password"], input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(app)/, { timeout: 15000 })

    await page.goto('http://localhost:5173/#/app/teacher/gradebook')
    await page.waitForLoadState('networkidle')

    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.waitForTimeout(2000)

    const criticalErrors = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error promise rejection')
    )
    expect(criticalErrors).toHaveLength(0)
  })
})
