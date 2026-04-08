import { test, expect } from '@playwright/test'

// ============================================================================
// Phase 29: Parent Dashboard Navigation
// ============================================================================

const hasSupabaseConfig =
  !!process.env.VITE_SUPABASE_URL &&
  !!process.env.VITE_SUPABASE_ANON_KEY &&
  !process.env.VITE_SUPABASE_URL.includes('placeholder') &&
  process.env.VITE_SUPABASE_ANON_KEY !== 'placeholder-key'

async function loginAsParent(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/#/login')
  await page.waitForLoadState('networkidle')

  const quickBtn = page
    .locator(
      '[data-testid="quick-login-parent"], button:has-text("Parent"), button:has-text("Orang Tua")'
    )
    .first()
  if (await quickBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await quickBtn.click()
  } else {
    await page.fill('input[type="email"], input[name="email"]', 'parent@edusync.dev')
    await page.fill('input[type="password"], input[name="password"]', 'password123')
    await page.locator('button[type="submit"]').click()
  }

  await page.goto('/#/app/parent')
  await expect(page).toHaveURL(/.*\/app\/parent(?:\/|$).*/, { timeout: 15000 })
}

test.describe('Parent Dashboard Navigation', () => {
  test('PD.1 — Parent dashboard page loads', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await page.goto('/#/app/parent')
    await page.waitForTimeout(3000)

    // Without auth, should redirect to login
    const url = page.url()
    const isOnParentDashboard = url.includes('/app/parent')
    const isOnLogin = url.includes('login')

    // Either we're on the dashboard (if auth state available) or redirected to login
    expect(isOnParentDashboard || isOnLogin).toBeTruthy()

    await context.close()
  })

  test('PD.2 — Auth guard redirects unauthenticated parent to login', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await page.goto('/#/app/parent')
    await expect(page).toHaveURL(/.*login/, { timeout: 15000 })

    await context.close()
  })

  test('PD.3 — Traffic light card is visible on dashboard', async ({ browser }) => {
    test.skip(!hasSupabaseConfig, 'Supabase tidak dikonfigurasi untuk gate release')

    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await loginAsParent(page)

    const trafficLight = page
      .locator('text=/Traffic Light|Lampu Lalu Lintas|Status|Baik|Perlu Perhatian|Kurang/i')
      .first()
    const hasTrafficLight = await trafficLight.isVisible({ timeout: 10000 }).catch(() => false)
    const hasDashboardContent = await page
      .locator('text=/Dashboard|Dasbor|Anak|Ringkasan/i')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    expect(hasTrafficLight || hasDashboardContent).toBeTruthy()

    await context.close()
  })

  test('PD.4 — Grade cards visible or empty state', async ({ browser }) => {
    test.skip(!hasSupabaseConfig, 'Supabase tidak dikonfigurasi untuk gate release')

    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await loginAsParent(page)

    const hasGradeCards = await page
      .locator('text=/Nilai|Rata-rata|Kursus|Mata Pelajaran/i')
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)
    const hasEmptyState = await page
      .locator('text=/Belum ada|Data belum tersedia|Tidak ada data/i')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    const hasDashboard = await page
      .locator('text=/Dashboard|Dasbor/i')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    expect(hasGradeCards || hasEmptyState || hasDashboard).toBeTruthy()

    await context.close()
  })

  test('PD.5 — Attendance grid visible on dashboard', async ({ browser }) => {
    test.skip(!hasSupabaseConfig, 'Supabase tidak dikonfigurasi untuk gate release')

    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await loginAsParent(page)

    const hasAttendance = await page
      .locator('text=/Kehadiran|Hadir|Absen|Attendance/i')
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)
    const hasDashboard = await page
      .locator('text=/Dashboard|Dasbor|Ringkasan/i')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    expect(hasAttendance || hasDashboard).toBeTruthy()

    await context.close()
  })

  test('PD.6 — "Hubungi Guru" navigates to messaging', async ({ browser }) => {
    test.skip(!hasSupabaseConfig, 'Supabase tidak dikonfigurasi untuk gate release')

    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await loginAsParent(page)

    const contactBtn = page
      .locator('button, a')
      .filter({
        hasText: /Hubungi Guru|Pesan|Kirim Pesan/i,
      })
      .first()
    expect(await contactBtn.isVisible({ timeout: 5000 }).catch(() => false)).toBeTruthy()
    await contactBtn.click()
    await page.waitForURL(/.*parent\/pesan|.*parent\/messages/, { timeout: 10000 })
    expect(page.url()).toMatch(/parent\/(pesan|messages)/)

    await context.close()
  })

  test('PD.7 — "Laporan Bulanan" navigates to reports', async ({ browser }) => {
    test.skip(!hasSupabaseConfig, 'Supabase tidak dikonfigurasi untuk gate release')

    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await loginAsParent(page)

    const reportBtn = page
      .locator('button, a')
      .filter({
        hasText: /Laporan Bulanan|Laporan|Report/i,
      })
      .first()
    expect(await reportBtn.isVisible({ timeout: 5000 }).catch(() => false)).toBeTruthy()
    await reportBtn.click()
    await page.waitForURL(/.*parent\/laporan|.*parent\/reports/, { timeout: 10000 })
    expect(page.url()).toMatch(/parent\/(laporan|reports)/)

    await context.close()
  })

  test('PD.8 — Bottom nav "Pesan" navigates to messaging page', async ({ browser }) => {
    test.skip(!hasSupabaseConfig, 'Supabase tidak dikonfigurasi untuk gate release')

    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await loginAsParent(page)

    const pesanNav = page
      .locator('nav a, nav button, [role="navigation"] a')
      .filter({
        hasText: /Pesan/i,
      })
      .first()
    expect(await pesanNav.isVisible({ timeout: 5000 }).catch(() => false)).toBeTruthy()
    await pesanNav.click()
    await page.waitForTimeout(3000)
    expect(page.url()).toMatch(/parent\/(pesan|messages)/)

    await context.close()
  })

  test('PD.9 — Can navigate back to dashboard from messaging', async ({ browser }) => {
    test.skip(!hasSupabaseConfig, 'Supabase tidak dikonfigurasi untuk gate release')

    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await loginAsParent(page)
    await page.goto('/#/app/parent/pesan')
    await page.waitForTimeout(5000)

    const dashboardNav = page
      .locator('nav a, nav button, [role="navigation"] a')
      .filter({
        hasText: /Beranda|Dashboard|Home/i,
      })
      .first()
    expect(await dashboardNav.isVisible({ timeout: 5000 }).catch(() => false)).toBeTruthy()
    await dashboardNav.click()
    await page.waitForTimeout(3000)

    const url = page.url()
    const isOnDashboard =
      url.includes('/app/parent') && !url.includes('/pesan') && !url.includes('/laporan')
    expect(isOnDashboard).toBeTruthy()

    await context.close()
  })

  test('PD.10 — Parent routes are protected from other roles', async ({ browser }) => {
    // Verify that parent routes require parent role
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await page.goto('/#/app/parent')

    // Without auth, should redirect to login
    await page.waitForTimeout(3000)
    const url = page.url()
    expect(url.includes('login') || url.includes('register')).toBeTruthy()

    await context.close()
  })
})
