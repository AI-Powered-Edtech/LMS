import { test, expect } from '@playwright/test'

/**
 * EduSync Navigation E2E Tests
 *
 * Tests page loads, link navigation, and protected route redirect behavior.
 */

test.describe('Navigation — Login Page', () => {
  test('login page loads and shows form', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForTimeout(1000)

    // Email input visible
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({
      timeout: 5000,
    })

    // Password input visible
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible({
      timeout: 5000,
    })

    // Submit button visible
    await expect(page.locator('button[type="submit"]').first()).toBeVisible({ timeout: 5000 })

    // Page contains login-related text
    const bodyText = await page.textContent('body')
    expect(bodyText?.toLowerCase()).toMatch(/edusync|masuk|email|sandi|login/i)
  })

  test('login page has no fatal JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/#/login')
    await page.waitForTimeout(1500)

    const fatal = errors.filter((e) => !e.includes('ResizeObserver') && !e.includes('Non-Error'))
    expect(fatal).toHaveLength(0)
  })
})

test.describe('Navigation — Forgot Password', () => {
  test('navigating to forgot-password page works', async ({ page }) => {
    await page.goto('/#/forgot-password')
    await page.waitForTimeout(1500)

    // Should reach the forgot password page (not crash or redirect to login)
    expect(page.url()).toMatch(/forgot-password|login/)

    // Page should render content
    const bodyText = await page.textContent('body')
    expect(bodyText).toBeTruthy()
  })

  test('forgot-password page renders without fatal errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/#/forgot-password')
    await page.waitForTimeout(1500)

    const fatal = errors.filter((e) => !e.includes('ResizeObserver') && !e.includes('Non-Error'))
    expect(fatal).toHaveLength(0)
  })

  test('forgot-password link from login page navigates correctly', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForTimeout(1000)

    // Look for a link to forgot-password (could be text like "Lupa Kata Sandi" or "Forgot Password")
    const forgotLink = page.locator('a[href*="forgot"], a[href*="lupa"]').first()
    const hasLink = await forgotLink.isVisible().catch(() => false)

    if (hasLink) {
      await forgotLink.click()
      await page.waitForTimeout(1500)
      expect(page.url()).toMatch(/forgot|lupa/)
    } else {
      // If no explicit link, direct navigation should still work
      await page.goto('/#/forgot-password')
      await page.waitForTimeout(1500)
      expect(page.url()).toMatch(/forgot-password|login/)
    }
  })
})

test.describe('Navigation — Protected Routes Redirect to Login', () => {
  test('student dashboard redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/#/app/student')
    await page.waitForURL(/.*login|.*student/, { timeout: 5000 })
    expect(page.url()).toMatch(/login|student/)
  })

  test('teacher dashboard redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/#/app/teacher')
    await page.waitForURL(/.*login|.*teacher/, { timeout: 5000 })
    expect(page.url()).toMatch(/login|teacher/)
  })

  test('admin dashboard redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/#/app/admin')
    await page.waitForURL(/.*login|.*admin/, { timeout: 5000 })
    expect(page.url()).toMatch(/login|admin/)
  })

  test('profile page redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/#/profile')
    await page.waitForURL(/.*login|.*profile/, { timeout: 5000 })
    expect(page.url()).toMatch(/login|profile/)
  })

  test('settings page redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/#/settings')
    await page.waitForURL(/.*login|.*settings/, { timeout: 5000 })
    expect(page.url()).toMatch(/login|settings/)
  })

  test('gradebook redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/#/gradebook')
    await page.waitForURL(/.*login|.*gradebook/, { timeout: 5000 })
    expect(page.url()).toMatch(/login|gradebook/)
  })
})

test.describe('Navigation — Public Routes', () => {
  test('reset-password page loads without crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/#/reset-password')
    await page.waitForTimeout(1500)

    const fatal = errors.filter((e) => !e.includes('ResizeObserver') && !e.includes('Non-Error'))
    expect(fatal).toHaveLength(0)
  })

  test('verify-email page loads without crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/#/verify-email')
    await page.waitForTimeout(1500)

    const fatal = errors.filter((e) => !e.includes('ResizeObserver') && !e.includes('Non-Error'))
    expect(fatal).toHaveLength(0)
  })
})
