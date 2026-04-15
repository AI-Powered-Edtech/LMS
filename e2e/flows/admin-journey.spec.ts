import { test, expect } from '@playwright/test'

const ADMIN_EMAIL = 'admin@edusync.dev'
const ADMIN_PASSWORD = 'password123'

async function loginAsAdmin(page: Parameters<Parameters<typeof test>[1]>[0]) {
  await page.goto('/#/login')
  const quickLogin = page.locator('[data-testid="quick-login-admin"], button:has-text("Admin")')
  if (await quickLogin.isVisible({ timeout: 2000 }).catch(() => false)) {
    await quickLogin.click()
  } else {
    await page.fill('input[type="email"]', ADMIN_EMAIL)
    await page.fill('input[type="password"]', ADMIN_PASSWORD)
    await page.click('button[type="submit"]')
  }
  await page.waitForURL(/dashboard|admin/, { timeout: 10000 })
}

test.describe('Admin Journey — Management Pages', () => {
  test('admin dapat login dan melihat dashboard', async ({ page }) => {
    await loginAsAdmin(page)
    await expect(page).not.toHaveURL(/login/)
  })

  test('admin dapat mengakses moderation dashboard', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/#/app/admin/moderation')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1, h2, [data-testid="moderation"]'))
      .toBeVisible({ timeout: 8000 })
  })

  test('admin dapat mengakses analytics dashboard', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/#/app/admin/analytics')
    await page.waitForLoadState('networkidle')
    const isNotBlank = await page.evaluate(() => document.body.textContent!.length > 100)
    expect(isNotBlank).toBeTruthy()
  })

  test('route protection: student tidak bisa akses admin', async ({ page }) => {
    await page.goto('/#/login')
    const quickLogin = page.locator('[data-testid="quick-login-student"], button:has-text("Student")')
    if (await quickLogin.isVisible({ timeout: 2000 }).catch(() => false)) {
      await quickLogin.click()
    } else {
      await page.fill('input[type="email"]', 'student@edusync.dev')
      await page.fill('input[type="password"]', 'password123')
      await page.click('button[type="submit"]')
    }
    await page.waitForURL(/dashboard|student/, { timeout: 10000 })
    await page.goto('/#/app/admin/moderation')
    await page.waitForTimeout(2000)
    expect(page.url()).toMatch(/unauthorized|dashboard|student/)
  })
})
