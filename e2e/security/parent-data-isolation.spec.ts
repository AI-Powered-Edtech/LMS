import { expect, test } from '@playwright/test'

import { skipIfNoAuth } from '../helpers/auth'

/**
 * SECURITY: Parent Portal Data Isolation Tests
 *
 * Validates that:
 * 1. Parents can access their own portal routes
 * 2. Parents cannot access student/teacher/admin/principal routes
 * 3. Unauthenticated access to parent routes redirects to login
 * 4. Parent registration route is accessible without auth
 *
 * Cross-layer risk (from audit CROSS-008):
 * Parent registers → links to child → must NOT be able to access unrelated
 * student data via URL manipulation (FERPA/GDPR violation risk).
 */

const BASE_URL = 'http://localhost:5173/#'

const PARENT = {
  email: process.env.E2E_PARENT_EMAIL ?? 'parent@edusync.dev',
  password: process.env.E2E_PARENT_PASSWORD ?? 'password123',
}

async function loginAsParent(page: any): Promise<void> {
  await page.goto(`${BASE_URL}/login`)
  await page.waitForLoadState('networkidle')
  await page.fill('input[type="email"], input[name="email"]', PARENT.email)
  await page.fill('input[type="password"], input[name="password"]', PARENT.password)
  await page.click('button[type="submit"]')
  await page.waitForLoadState('networkidle')
}

test.describe('Parent Portal — Data Isolation', () => {
  test.beforeEach(() => {
    skipIfNoAuth()
  })

  test('unauthenticated access to parent route redirects to login', async ({ page }) => {
    await page.goto(`${BASE_URL}/app/parent`)
    await page.waitForLoadState('networkidle')
    const url = page.url()
    expect(url).toContain('/login')
  })

  test('parent registration page is publicly accessible', async ({ page }) => {
    await page.goto(`${BASE_URL}/register-parent`)
    await page.waitForLoadState('networkidle')
    const url = page.url()
    // Should not redirect away — the page should render
    expect(url).not.toContain('/login')
    expect(url).not.toContain('/unauthorized')
  })

  test('parent cannot access student dashboard', async ({ page }) => {
    await loginAsParent(page)
    await page.goto(`${BASE_URL}/app/student/dashboard`)
    await page.waitForLoadState('networkidle')
    const url = page.url()
    expect(url).not.toMatch(/\/app\/student\/dashboard/)
  })

  test('parent cannot access teacher routes', async ({ page }) => {
    await loginAsParent(page)
    await page.goto(`${BASE_URL}/app/teacher/teaching-hub`)
    await page.waitForLoadState('networkidle')
    const url = page.url()
    expect(url).not.toMatch(/\/app\/teacher\/teaching-hub/)
  })

  test('parent cannot access admin user management', async ({ page }) => {
    await loginAsParent(page)
    await page.goto(`${BASE_URL}/app/admin/users`)
    await page.waitForLoadState('networkidle')
    const url = page.url()
    expect(url).not.toMatch(/\/app\/admin\/users/)
  })

  test('parent cannot access admin feature flags', async ({ page }) => {
    await loginAsParent(page)
    await page.goto(`${BASE_URL}/app/admin/feature-flags`)
    await page.waitForLoadState('networkidle')
    const url = page.url()
    expect(url).not.toMatch(/\/app\/admin\/feature-flags/)
  })

  test('parent cannot access principal dashboard', async ({ page }) => {
    await loginAsParent(page)
    await page.goto(`${BASE_URL}/app/principal`)
    await page.waitForLoadState('networkidle')
    const url = page.url()
    expect(url).not.toMatch(/\/app\/principal/)
  })

  test('parent dashboard is accessible to authenticated parent', async ({ page }) => {
    await loginAsParent(page)
    await page.goto(`${BASE_URL}/app/parent`)
    await page.waitForLoadState('networkidle')
    const url = page.url()
    // Should reach the parent area — not redirected to unauthorized or login
    expect(url).not.toContain('/unauthorized')
    expect(url).not.toContain('/login')
  })
})
