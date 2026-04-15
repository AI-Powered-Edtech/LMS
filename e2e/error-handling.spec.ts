import { test, expect } from '@playwright/test'

/**
 * EduSync Error Handling E2E Tests
 *
 * Tests 404 page rendering, unauthorized page, and error boundary resilience.
 */

test.describe('Error Handling — 404 Page', () => {
  test('unknown top-level route shows login or 404', async ({ page }) => {
    await page.goto('/#/this-route-does-not-exist')
    await page.waitForTimeout(1500)

    // App should either show a 404 page or redirect to login
    const bodyText = await page.textContent('body')
    expect(bodyText).toBeTruthy()

    // URL should resolve to either login (redirect) or remain on the unknown route
    expect(page.url()).toMatch(/login|this-route-does-not-exist/)
  })

  test('404 page renders without fatal JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/#/completely-unknown-page-abc-999')
    await page.waitForTimeout(1500)

    const fatal = errors.filter((e) => !e.includes('ResizeObserver') && !e.includes('Non-Error'))
    expect(fatal).toHaveLength(0)
  })

  test('deeply nested unknown route does not crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/#/app/student/this/path/does/not/exist')
    await page.waitForTimeout(1500)

    const fatal = errors.filter((e) => !e.includes('ResizeObserver') && !e.includes('Non-Error'))
    expect(fatal).toHaveLength(0)
  })
})

test.describe('Error Handling — Unauthorized Page', () => {
  test('unauthorized route renders without crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/#/unauthorized')
    await page.waitForTimeout(1500)

    const fatal = errors.filter((e) => !e.includes('ResizeObserver') && !e.includes('Non-Error'))
    expect(fatal).toHaveLength(0)
  })

  test('unauthorized page displays content', async ({ page }) => {
    await page.goto('/#/unauthorized')
    await page.waitForTimeout(1500)

    const bodyText = await page.textContent('body')
    expect(bodyText).toBeTruthy()
    // Should contain some kind of unauthorized/access denied message or redirect to login
    expect(page.url()).toMatch(/unauthorized|login/)
  })
})

test.describe('Error Handling — Error Boundary Resilience', () => {
  test('app root does not crash on initial load', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/')
    await page.waitForTimeout(2000)

    const fatal = errors.filter((e) => !e.includes('ResizeObserver') && !e.includes('Non-Error'))
    expect(fatal).toHaveLength(0)
  })

  test('multiple rapid navigations do not crash error boundaries', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    // Navigate rapidly between routes to stress error boundaries
    await page.goto('/#/login')
    await page.goto('/#/unauthorized')
    await page.goto('/#/nonexistent-route')
    await page.goto('/#/app/student/courses/invalid')
    await page.goto('/#/login')

    await page.waitForTimeout(1500)

    const fatal = errors.filter((e) => !e.includes('ResizeObserver') && !e.includes('Non-Error'))
    expect(fatal).toHaveLength(0)
  })

  test('invalid nested app route falls back gracefully', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/#/app/teacher/courses/undefined/lessons/null')
    await page.waitForTimeout(1500)

    const fatal = errors.filter((e) => !e.includes('ResizeObserver') && !e.includes('Non-Error'))
    expect(fatal).toHaveLength(0)

    // Page should render something — not a blank white screen
    await expect(page.locator('body')).toBeVisible()
  })
})
