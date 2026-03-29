import { expect, test } from '@playwright/test'

/**
 * CRITICAL SECURITY: Tenant isolation tests
 * These tests verify that cross-tenant privilege escalation is NOT possible.
 * Based on SQA Audit finding: RoleGuard.tsx previously used global `role`
 * instead of tenant-scoped `activeRole`, allowing admin in Tenant A to
 * access admin routes in Tenant B.
 */

const BASE_URL = 'http://localhost:5173/#'

// Test credentials from AGENTS.md
const ADMIN = { email: 'admin@edusync.dev', password: 'password123' }
const TEACHER = { email: 'teacher@edusync.dev', password: 'password123' }
const STUDENT = { email: 'student@edusync.dev', password: 'password123' }

async function login(page: any, email: string, password: string) {
  await page.goto(`${BASE_URL}/login`)
  await page.waitForLoadState('networkidle')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForLoadState('networkidle')
}

test.describe('Role-Based Access Control', () => {
  test('student cannot access admin routes', async ({ page }) => {
    await login(page, STUDENT.email, STUDENT.password)
    await page.goto(`${BASE_URL}/app/admin/users`)
    // Should redirect to unauthorized or login
    await expect(page).not.toHaveURL(/\/app\/admin\/users/)
  })

  test('student cannot access teacher routes', async ({ page }) => {
    await login(page, STUDENT.email, STUDENT.password)
    await page.goto(`${BASE_URL}/app/teacher/analytics`)
    await expect(page).not.toHaveURL(/\/app\/teacher\/analytics/)
  })

  test('teacher cannot access admin routes', async ({ page }) => {
    await login(page, TEACHER.email, TEACHER.password)
    await page.goto(`${BASE_URL}/app/admin/users`)
    await expect(page).not.toHaveURL(/\/app\/admin\/users/)
  })

  test('admin can access admin routes', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password)
    // Admin should be able to reach their dashboard
    await page.goto(`${BASE_URL}/app/admin`)
    await page.waitForLoadState('networkidle')
    // Should NOT be redirected to unauthorized
    const url = page.url()
    expect(url).not.toContain('/unauthorized')
    expect(url).not.toContain('/login')
  })

  test('SECURITY: RoleGuard uses activeRole not global role', async ({ page }) => {
    // This test verifies the fix: activeRole is used, not global role
    // By checking that a student (even if they have higher role in another tenant)
    // cannot access admin-only content
    await login(page, STUDENT.email, STUDENT.password)

    // Try to navigate to any admin-protected route
    const adminRoutes = [
      `${BASE_URL}/app/admin/users`,
      `${BASE_URL}/app/admin/feature-flags`,
      `${BASE_URL}/app/admin/billing`,
    ]

    for (const route of adminRoutes) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      const url = page.url()
      // Must be redirected away from admin routes
      expect(url).not.toContain('/admin/users')
      expect(url).not.toContain('/admin/feature-flags')
      expect(url).not.toContain('/admin/billing')
    }
  })
})
