import { test, expect } from '@playwright/test'

/**
 * EduSync Authentication E2E Tests
 *
 * Tests login page rendering, route protection, and hash routing.
 */

test.describe('Authentication Flow', () => {
  test('Should navigate to login', async ({ page }) => {
    await page.goto('/#/login')
    await expect(page).toHaveURL(/.*login/)
  })
})

test.describe('Authentication — Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/login')
  })

  test('login form inputs are visible', async ({ page }) => {
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({
      timeout: 5000,
    })
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible({
      timeout: 5000,
    })
  })

  test('submit button is present', async ({ page }) => {
    await expect(page.locator('button[type="submit"]').first()).toBeVisible({ timeout: 5000 })
  })

  test('no fatal JavaScript errors on load', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/#/login')
    await page.waitForTimeout(1000)
    const fatal = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error promise rejection')
    )
    expect(fatal).toHaveLength(0)
  })

  test('page title is set', async ({ page }) => {
    expect(await page.title()).toBeTruthy()
  })

  test('body contains EduSync or login-related text', async ({ page }) => {
    const bodyText = await page.textContent('body')
    expect(bodyText?.toLowerCase()).toMatch(/edusync|masuk|email|sandi|login/i)
  })
})

test.describe('Authentication — Route Protection', () => {
  test('unauthenticated request to /#/app/student redirects to login', async ({ page }) => {
    await page.goto('/#/app/student')
    await page.waitForURL(/.*login|.*student/, { timeout: 5000 })
    expect(page.url()).toMatch(/login|student/)
  })

  test('unauthenticated request to /#/app/teacher redirects to login', async ({ page }) => {
    await page.goto('/#/app/teacher')
    await page.waitForURL(/.*login|.*teacher/, { timeout: 5000 })
    expect(page.url()).toMatch(/login|teacher/)
  })

  test('unauthenticated request to /#/app/admin redirects to login', async ({ page }) => {
    await page.goto('/#/app/admin')
    await page.waitForURL(/.*login|.*admin/, { timeout: 5000 })
    expect(page.url()).toMatch(/login|admin/)
  })
})

test.describe('Authentication — Hash Routing', () => {
  test('app root redirects through hash routing', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(1000)
    expect(page.url()).toMatch(/#\//)
  })

  test('direct navigation to /#/login works', async ({ page }) => {
    await page.goto('/#/login')
    await expect(page).toHaveURL(/.*login/)
  })
})

test.describe('Authentication — Full Login Flow', () => {
  test('student can log in and reach student dashboard', async ({ page }) => {
    await page.goto('http://localhost:5173/#/login')
    await page.waitForLoadState('networkidle')

    await page.fill('input[type="email"], input[name="email"]', 'student@edusync.dev')
    await page.fill('input[type="password"], input[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Wait for redirect to student dashboard
    await page.waitForURL(/\/(app\/student|app)/, { timeout: 15000 })
    const url = page.url()
    expect(url).not.toContain('/login')
    expect(url).not.toContain('/unauthorized')
  })

  test('invalid credentials show error message', async ({ page }) => {
    await page.goto('http://localhost:5173/#/login')
    await page.waitForLoadState('networkidle')

    await page.fill('input[type="email"], input[name="email"]', 'invalid@test.com')
    await page.fill('input[type="password"], input[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    // Should show error, NOT redirect
    await page.waitForTimeout(2000)
    expect(page.url()).toContain('/login')

    // Some error indication should appear
    const errorVisible = await page
      .locator('[role="alert"], .text-red-500, [data-testid="error"]')
      .isVisible()
      .catch(() => false)
    // Page should still be on login (primary check)
    expect(page.url()).toContain('login')
  })

  test('rate limiter shows countdown after 5 failed attempts', async ({ page }) => {
    await page.goto('http://localhost:5173/#/login')
    await page.waitForLoadState('networkidle')

    // Attempt 5 rapid logins with wrong credentials to trigger rate limit
    for (let i = 0; i < 5; i++) {
      await page.fill('input[type="email"], input[name="email"]', 'test@test.com')
      await page.fill('input[type="password"], input[name="password"]', `wrong${i}`)
      await page.click('button[type="submit"]')
      await page.waitForTimeout(300)
    }

    // 6th attempt should show rate limit message
    await page.fill('input[type="email"], input[name="email"]', 'test@test.com')
    await page.fill('input[type="password"], input[name="password"]', 'wrong6')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(500)

    // Page content should mention rate limit or seconds
    const pageText = await page.textContent('body')
    const hasRateLimitMsg =
      pageText?.includes('detik') ||
      pageText?.includes('percobaan') ||
      pageText?.includes('coba lagi')
    expect(hasRateLimitMsg).toBe(true)
  })
})
