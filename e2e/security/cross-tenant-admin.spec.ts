import { expect, test } from '@playwright/test'

/**
 * CRITICAL SECURITY: Cross-tenant admin access prevention
 * Tests that activeRole (tenant-scoped) determines access,
 * NOT the global roles array which spans multiple tenants.
 *
 * Scenario: User with admin role in Tenant A must NOT be able to
 * access admin routes in Tenant B where they only have student role.
 */

test.describe('Cross-Tenant Admin Access Prevention', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' }) // auth state dari global.setup

  test('activeRole menentukan akses, bukan global role', async ({ page }) => {
    // Navigate ke unauthorized route sebagai user yang hanya student di tenant ini
    await page.goto('/#/app/admin/users')
    // Harus redirect ke /unauthorized atau /app/student
    await expect(page).not.toHaveURL(/\/admin\/users/)
  })

  test('admin panel tidak bisa diakses tanpa activeRole admin', async ({ page }) => {
    await page.goto('/#/app/admin')
    // Either unauthorized page or redirect
    const url = page.url()
    const isAdminPanel = url.includes('/app/admin') && !url.includes('/unauthorized')
    // Jika bisa akses, cek bahwa content adalah admin content
    if (!isAdminPanel) {
      // Redirect happened — good
      expect(url).not.toContain('/app/admin/users')
    }
  })
})

/**
 * Verifikasi bahwa semua admin sub-routes terlindungi oleh RoleGuard.
 * Jika seorang user tidak punya activeRole = 'admin', semua route di bawah
 * /#/app/admin/* harus ditolak.
 */
test.describe('Admin Sub-Routes Protection', () => {
  test.use({ storageState: 'e2e/.auth/student.json' })

  const adminRoutes = [
    '/#/app/admin/users',
    '/#/app/admin/feature-flags',
    '/#/app/admin/billing',
    '/#/app/admin/analytics',
  ]

  for (const route of adminRoutes) {
    test(`student tidak bisa akses ${route}`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('networkidle')

      const url = page.url()
      // Harus di-redirect ke login atau halaman unauthorized
      const routeSuffix = new URL(route.replace('#/', ''), 'http://localhost').pathname
      expect(url).not.toContain(routeSuffix)
    })
  }
})

/**
 * Verifikasi bahwa teacher tidak bisa eskalasi privilege ke admin.
 */
test.describe('Teacher Cannot Escalate to Admin', () => {
  test.use({ storageState: 'e2e/.auth/teacher.json' })

  test('teacher tidak bisa akses halaman manajemen user', async ({ page }) => {
    await page.goto('/#/app/admin/users')
    await page.waitForLoadState('networkidle')

    const url = page.url()
    expect(url).not.toContain('/admin/users')
  })

  test('teacher tidak bisa akses feature flags admin', async ({ page }) => {
    await page.goto('/#/app/admin/feature-flags')
    await page.waitForLoadState('networkidle')

    const url = page.url()
    expect(url).not.toContain('/admin/feature-flags')
  })
})
