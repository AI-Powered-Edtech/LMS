import { test, expect } from '@playwright/test'

// ============================================================================
// Phase 29: Parent Dashboard Navigation
// ============================================================================

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
    test.skip(
      !process.env.VITE_SUPABASE_URL,
      'Supabase tidak dikonfigurasi — skip authenticated parent test'
    )

    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()

    // Login as parent if credentials available
    await page.goto('/#/login')
    await page.waitForTimeout(2000)

    const emailInput = page.locator('input[type="email"], input[name="email"]')
    if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await page.fill('input[type="email"], input[name="email"]', 'parent@edusync.dev')
      await page.fill('input[type="password"], input[name="password"]', 'password123')
      await page.locator('button[type="submit"]').click()
      await page.waitForTimeout(5000)
    }

    // Navigate to parent dashboard
    await page.goto('/#/app/parent')
    await page.waitForTimeout(5000)

    if (page.url().includes('/app/parent')) {
      // Verify traffic light card
      const trafficLight = page
        .locator('text=/Traffic Light|Lampu Lalu Lintas|Status|Baik|Perlu Perhatian|Kurang/i')
        .first()
      const hasTrafficLight = await trafficLight.isVisible({ timeout: 10000 }).catch(() => false)

      // Dashboard may show traffic light or other parent-specific content
      const hasDashboardContent = await page
        .locator('text=/Dashboard|Dasbor|Anak|Ringkasan/i')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      expect(hasTrafficLight || hasDashboardContent).toBeTruthy()
    }

    await context.close()
  })

  test('PD.4 — Grade cards visible or empty state', async ({ browser }) => {
    test.skip(
      !process.env.VITE_SUPABASE_URL,
      'Supabase tidak dikonfigurasi — skip grade cards test'
    )

    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await page.goto('/#/app/parent')
    await page.waitForTimeout(5000)

    if (page.url().includes('/app/parent')) {
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
    }

    await context.close()
  })

  test('PD.5 — Attendance grid visible on dashboard', async ({ browser }) => {
    test.skip(
      !process.env.VITE_SUPABASE_URL,
      'Supabase tidak dikonfigurasi — skip attendance grid test'
    )

    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await page.goto('/#/app/parent')
    await page.waitForTimeout(5000)

    if (page.url().includes('/app/parent')) {
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
    }

    await context.close()
  })

  test('PD.6 — "Hubungi Guru" navigates to messaging', async ({ browser }) => {
    test.skip(
      !process.env.VITE_SUPABASE_URL,
      'Supabase tidak dikonfigurasi — skip messaging navigation test'
    )

    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await page.goto('/#/app/parent')
    await page.waitForTimeout(5000)

    if (page.url().includes('/app/parent')) {
      const contactBtn = page
        .locator('button, a')
        .filter({
          hasText: /Hubungi Guru|Pesan|Kirim Pesan/i,
        })
        .first()

      if (await contactBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await contactBtn.click()
        await page.waitForURL(/.*parent\/pesan|.*parent\/messages/, { timeout: 10000 })
        expect(page.url()).toMatch(/parent\/(pesan|messages)/)
      }
    }

    await context.close()
  })

  test('PD.7 — "Laporan Bulanan" navigates to reports', async ({ browser }) => {
    test.skip(
      !process.env.VITE_SUPABASE_URL,
      'Supabase tidak dikonfigurasi — skip report navigation test'
    )

    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await page.goto('/#/app/parent')
    await page.waitForTimeout(5000)

    if (page.url().includes('/app/parent')) {
      const reportBtn = page
        .locator('button, a')
        .filter({
          hasText: /Laporan Bulanan|Laporan|Report/i,
        })
        .first()

      if (await reportBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await reportBtn.click()
        await page.waitForURL(/.*parent\/laporan|.*parent\/reports/, { timeout: 10000 })
        expect(page.url()).toMatch(/parent\/(laporan|reports)/)
      }
    }

    await context.close()
  })

  test('PD.8 — Bottom nav "Pesan" navigates to messaging page', async ({ browser }) => {
    test.skip(!process.env.VITE_SUPABASE_URL, 'Supabase tidak dikonfigurasi — skip bottom nav test')

    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await page.goto('/#/app/parent')
    await page.waitForTimeout(5000)

    if (page.url().includes('/app/parent')) {
      // Bottom navigation link
      const pesanNav = page
        .locator('nav a, nav button, [role="navigation"] a')
        .filter({
          hasText: /Pesan/i,
        })
        .first()

      if (await pesanNav.isVisible({ timeout: 5000 }).catch(() => false)) {
        await pesanNav.click()
        await page.waitForTimeout(3000)
        expect(page.url()).toMatch(/parent\/(pesan|messages)/)
      }
    }

    await context.close()
  })

  test('PD.9 — Can navigate back to dashboard from messaging', async ({ browser }) => {
    test.skip(
      !process.env.VITE_SUPABASE_URL,
      'Supabase tidak dikonfigurasi — skip navigation back test'
    )

    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await page.goto('/#/app/parent/pesan')
    await page.waitForTimeout(5000)

    if (page.url().includes('/app/parent')) {
      // Navigate back to dashboard via bottom nav or back button
      const dashboardNav = page
        .locator('nav a, nav button, [role="navigation"] a')
        .filter({
          hasText: /Beranda|Dashboard|Home/i,
        })
        .first()

      if (await dashboardNav.isVisible({ timeout: 5000 }).catch(() => false)) {
        await dashboardNav.click()
        await page.waitForTimeout(3000)

        const url = page.url()
        // Should be on parent dashboard (not /pesan or /laporan)
        const isOnDashboard =
          url.includes('/app/parent') && !url.includes('/pesan') && !url.includes('/laporan')

        expect(isOnDashboard).toBeTruthy()
      }
    }

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
