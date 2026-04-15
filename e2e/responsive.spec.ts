import { test, expect } from '@playwright/test'

/**
 * EduSync Responsive Layout E2E Tests
 *
 * Tests that key pages render correctly across mobile, tablet, and desktop viewports.
 * Verifies no horizontal overflow and that critical elements remain visible.
 */

const VIEWPORTS = {
  mobile: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
} as const

test.describe('Responsive — Login Page (Mobile 375px)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile)
  })

  test('login page renders at mobile width', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForTimeout(1000)

    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({
      timeout: 5000,
    })
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible({
      timeout: 5000,
    })
  })

  test('no horizontal overflow at mobile width', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForTimeout(1000)

    const scrollWidth = await page.evaluate(() => document.body.scrollWidth)
    // Allow a small tolerance (20px) for sub-pixel rendering
    expect(scrollWidth).toBeLessThanOrEqual(VIEWPORTS.mobile.width + 20)
  })

  test('submit button is visible at mobile width', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForTimeout(1000)

    await expect(page.locator('button[type="submit"]').first()).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Responsive — Login Page (Tablet 768px)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet)
  })

  test('login page renders at tablet width', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForTimeout(1000)

    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({
      timeout: 5000,
    })
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible({
      timeout: 5000,
    })
  })

  test('no horizontal overflow at tablet width', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForTimeout(1000)

    const scrollWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(scrollWidth).toBeLessThanOrEqual(VIEWPORTS.tablet.width + 20)
  })

  test('submit button is visible at tablet width', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForTimeout(1000)

    await expect(page.locator('button[type="submit"]').first()).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Responsive — Login Page (Desktop 1440px)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop)
  })

  test('login page renders at desktop width', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForTimeout(1000)

    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({
      timeout: 5000,
    })
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible({
      timeout: 5000,
    })
  })

  test('no horizontal overflow at desktop width', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForTimeout(1000)

    const scrollWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(scrollWidth).toBeLessThanOrEqual(VIEWPORTS.desktop.width + 20)
  })

  test('login form is centered or reasonably positioned', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForTimeout(1000)

    const emailInput = page.locator('input[type="email"], input[name="email"]')
    await expect(emailInput).toBeVisible({ timeout: 5000 })

    const box = await emailInput.boundingBox()
    expect(box).toBeTruthy()
    // Input should not be flush to the left edge (should have some centering/padding)
    expect(box!.x).toBeGreaterThan(50)
  })
})

test.describe('Responsive — Cross-Viewport Consistency', () => {
  test('page title is consistent across viewports', async ({ page }) => {
    const titles: string[] = []

    for (const [, viewport] of Object.entries(VIEWPORTS)) {
      await page.setViewportSize(viewport)
      await page.goto('/#/login')
      await page.waitForTimeout(500)
      titles.push(await page.title())
    }

    // All titles should be the same
    expect(titles[0]).toBe(titles[1])
    expect(titles[1]).toBe(titles[2])
  })

  test('no fatal JS errors across viewports', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    for (const [, viewport] of Object.entries(VIEWPORTS)) {
      await page.setViewportSize(viewport)
      await page.goto('/#/login')
      await page.waitForTimeout(500)
    }

    const fatal = errors.filter((e) => !e.includes('ResizeObserver') && !e.includes('Non-Error'))
    expect(fatal).toHaveLength(0)
  })
})
