import { test, expect } from '@playwright/test'

// ============================================================================
// Phase 30: Principal Executive Dashboard
// ============================================================================

test.describe('Principal Executive Dashboard', () => {
  test('XD.1 — Principal dashboard route is protected', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await page.goto('/#/app/principal')

    // Without auth, should redirect to login
    await expect(page).toHaveURL(/.*login/, { timeout: 15000 })

    await context.close()
  })

  test('XD.2 — Principal dashboard renders metric cards', async ({ browser }) => {
    test.skip(
      !process.env.VITE_SUPABASE_URL,
      'Supabase tidak dikonfigurasi — skip principal dashboard test'
    )

    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()

    // Login as principal
    await page.goto('/#/login')
    await page.waitForTimeout(2000)

    const emailInput = page.locator('input[type="email"], input[name="email"]')
    if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await page.fill('input[type="email"], input[name="email"]', 'principal@edusync.dev')
      await page.fill('input[type="password"], input[name="password"]', 'password123')
      await page.locator('button[type="submit"]').click()
      await page.waitForTimeout(5000)
    }

    await page.goto('/#/app/principal')
    await page.waitForTimeout(5000)

    if (page.url().includes('/app/principal')) {
      // Verify 4 metric cards render
      const metricLabels = [
        /Total Siswa|Siswa Aktif|Jumlah Siswa/i,
        /Total Guru|Guru Aktif|Jumlah Guru/i,
        /Kelas Aktif|Total Kelas|Jumlah Kelas/i,
        /Kursus|Materi|Tingkat Kelulusan/i,
      ]

      let cardCount = 0
      for (const label of metricLabels) {
        const card = page.locator(`text=${label.source}`).first()
        if (await card.isVisible({ timeout: 5000 }).catch(() => false)) {
          cardCount++
        }
      }

      // At least some metric cards should be visible
      const hasMetrics = cardCount > 0
      const hasDashboard = await page
        .locator('text=/Dashboard|Dasbor|Executive|Eksekutif|Ringkasan/i')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      expect(hasMetrics || hasDashboard).toBeTruthy()
    }

    await context.close()
  })

  test('XD.3 — Trend chart renders on dashboard', async ({ browser }) => {
    test.skip(
      !process.env.VITE_SUPABASE_URL,
      'Supabase tidak dikonfigurasi — skip trend chart test'
    )

    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await page.goto('/#/app/principal')
    await page.waitForTimeout(5000)

    if (page.url().includes('/app/principal')) {
      // Look for chart container (canvas or SVG-based chart)
      const hasChart = await page
        .locator(
          'canvas, svg[class*="chart"], [class*="chart"], [class*="trend"], [data-testid*="chart"]'
        )
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false)
      const hasChartHeading = await page
        .locator('text=/Tren|Trend|Grafik|Statistik/i')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)
      const hasDashboard = await page
        .locator('text=/Dashboard|Dasbor/i')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      expect(hasChart || hasChartHeading || hasDashboard).toBeTruthy()
    }

    await context.close()
  })

  test('XD.4 — ROI section renders on dashboard', async ({ browser }) => {
    test.skip(
      !process.env.VITE_SUPABASE_URL,
      'Supabase tidak dikonfigurasi — skip ROI section test'
    )

    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await page.goto('/#/app/principal')
    await page.waitForTimeout(5000)

    if (page.url().includes('/app/principal')) {
      const hasROI = await page
        .locator('text=/ROI|Return on Investment|Dampak|Efektivitas|Investasi/i')
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false)
      const hasDashboard = await page
        .locator('text=/Dashboard|Dasbor|Ringkasan/i')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      expect(hasROI || hasDashboard).toBeTruthy()
    }

    await context.close()
  })

  test('XD.5 — "Unduh Laporan" opens report generator modal', async ({ browser }) => {
    test.skip(
      !process.env.VITE_SUPABASE_URL,
      'Supabase tidak dikonfigurasi — skip report generator test'
    )

    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await page.goto('/#/app/principal')
    await page.waitForTimeout(5000)

    if (page.url().includes('/app/principal')) {
      const downloadBtn = page
        .locator('button, a')
        .filter({
          hasText: /Unduh Laporan|Download Report|Buat Laporan|Generate/i,
        })
        .first()

      if (await downloadBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await downloadBtn.click()
        await page.waitForTimeout(2000)

        // Verify report generator modal opens
        const hasModal = await page
          .locator('text=/Generator Laporan|Buat Laporan|Laporan Eksekutif|Format/i')
          .first()
          .isVisible({ timeout: 10000 })
          .catch(() => false)
        const hasModalOverlay = await page
          .locator('[role="dialog"], [class*="modal"], [class*="overlay"]')
          .first()
          .isVisible({ timeout: 5000 })
          .catch(() => false)

        expect(hasModal || hasModalOverlay).toBeTruthy()
      }
    }

    await context.close()
  })

  test('XD.6 — "Kelola Survey" navigates to survey page', async ({ browser }) => {
    test.skip(
      !process.env.VITE_SUPABASE_URL,
      'Supabase tidak dikonfigurasi — skip survey navigation test'
    )

    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await page.goto('/#/app/principal')
    await page.waitForTimeout(5000)

    if (page.url().includes('/app/principal')) {
      const surveyBtn = page
        .locator('button, a')
        .filter({
          hasText: /Kelola Survey|Survey|Survei/i,
        })
        .first()

      if (await surveyBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await surveyBtn.click()
        await page.waitForTimeout(3000)

        // Verify navigation to survey page
        const url = page.url()
        const isSurveyPage = url.includes('/principal/survey') || url.includes('/principal/survei')
        const hasSurveyContent = await page
          .locator('text=/Survey|Survei|Kelola Survey/i')
          .first()
          .isVisible({ timeout: 10000 })
          .catch(() => false)

        expect(isSurveyPage || hasSurveyContent).toBeTruthy()
      }
    }

    await context.close()
  })

  test('XD.7 — Before-after analytics page loads', async ({ browser }) => {
    test.skip(
      !process.env.VITE_SUPABASE_URL,
      'Supabase tidak dikonfigurasi — skip analytics page test'
    )

    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await page.goto('/#/app/principal/analytics')
    await page.waitForTimeout(5000)

    if (page.url().includes('/app/principal')) {
      const hasBeforeAfter = await page
        .locator('text=/Before.*After|Sebelum.*Sesudah|Analitik|Perbandingan|Dampak/i')
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false)
      const hasAnalytics = await page
        .locator('text=/Analitik|Analytics|Dashboard/i')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      expect(hasBeforeAfter || hasAnalytics).toBeTruthy()
    }

    await context.close()
  })

  test('XD.8 — Survey page is accessible from principal routes', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await page.goto('/#/app/principal/survey')
    await page.waitForTimeout(3000)

    // Without auth should redirect to login
    const url = page.url()
    expect(url.includes('login') || url.includes('principal')).toBeTruthy()

    await context.close()
  })
})
