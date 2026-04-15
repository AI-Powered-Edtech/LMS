import { test, expect } from '@playwright/test'

const TEACHER_EMAIL = 'teacher@edusync.dev'
const TEACHER_PASSWORD = 'password123'

async function loginAsTeacher(page: Parameters<Parameters<typeof test>[1]>[0]) {
  await page.goto('/#/login')
  const quickLogin = page.locator('[data-testid="quick-login-teacher"], button:has-text("Teacher")')
  if (await quickLogin.isVisible({ timeout: 2000 }).catch(() => false)) {
    await quickLogin.click()
  } else {
    await page.fill('input[type="email"]', TEACHER_EMAIL)
    await page.fill('input[type="password"]', TEACHER_PASSWORD)
    await page.click('button[type="submit"]')
  }
  await page.waitForURL(/dashboard|teacher/, { timeout: 10000 })
}

test.describe('Teacher Journey — Dashboard to Analytics', () => {
  test('teacher dapat login dan melihat dashboard', async ({ page }) => {
    await loginAsTeacher(page)
    await expect(page).not.toHaveURL(/login/)
    await expect(page.locator('main, [role="main"]')).toBeVisible({ timeout: 8000 })
  })

  test('teacher dapat membuka halaman kelas', async ({ page }) => {
    await loginAsTeacher(page)
    await page.goto('/#/app/teacher/classes')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1, h2, [data-testid="classes-list"], [data-testid="empty-state"]'))
      .toBeVisible({ timeout: 8000 })
  })

  test('teacher dapat membuka course list', async ({ page }) => {
    await loginAsTeacher(page)
    await page.goto('/#/teaching/courses')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1, h2')).toBeVisible({ timeout: 8000 })
  })

  test('teacher dapat membuka halaman analytics', async ({ page }) => {
    await loginAsTeacher(page)
    await page.goto('/#/app/teacher/analytics')
    await page.waitForLoadState('networkidle')
    const isNotBlank = await page.evaluate(() => document.body.textContent!.length > 100)
    expect(isNotBlank).toBeTruthy()
  })

  test('teacher dapat mengakses gradebook', async ({ page }) => {
    await loginAsTeacher(page)
    await page.goto('/#/app/teacher/gradebook')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1, h2, table, [data-testid="gradebook"]'))
      .toBeVisible({ timeout: 8000 })
  })
})
