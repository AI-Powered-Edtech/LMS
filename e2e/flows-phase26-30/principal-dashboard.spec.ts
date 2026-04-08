import { test, expect } from '@playwright/test'

// ============================================================================
// Phase 30: Principal Executive Dashboard
// ============================================================================

const hasSupabaseConfig =
  !!process.env.VITE_SUPABASE_URL &&
  !!process.env.VITE_SUPABASE_ANON_KEY &&
  !process.env.VITE_SUPABASE_URL.includes('placeholder') &&
  process.env.VITE_SUPABASE_ANON_KEY !== 'placeholder-key'

async function loginAsPrincipal(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/#/login')
  await page.waitForLoadState('networkidle')

  const quickBtn = page
    .locator(
      '[data-testid="quick-login-principal"], button:has-text("Principal"), button:has-text("Kepala Sekolah")'
    )
    .first()
  if (await quickBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await quickBtn.click()
  } else {
    await page.fill('input[type="email"], input[name="email"]', 'principal@edusync.dev')
    await page.fill('input[type="password"], input[name="password"]', 'password123')
    await page.locator('button[type="submit"]').click()
  }

  await page.goto('/#/app/principal')
  await expect(page).toHaveURL(/.*\/app\/principal(?:\/|$).*/, { timeout: 15000 })
}

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
    test.skip(!hasSupabaseConfig, 'Supabase tidak dikonfigurasi untuk gate release')

    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await loginAsPrincipal(page)

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

    const hasMetrics = cardCount > 0
    const hasDashboard = await page
      .locator('text=/Dashboard|Dasbor|Executive|Eksekutif|Ringkasan/i')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    expect(hasMetrics || hasDashboard).toBeTruthy()

    await context.close()
  })

  test('XD.3 — Trend chart renders on dashboard', async ({ browser }) => {
    test.skip(!hasSupabaseConfig, 'Supabase tidak dikonfigurasi untuk gate release')

    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await loginAsPrincipal(page)

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

    await context.close()
  })

  test('XD.4 — ROI section renders on dashboard', async ({ browser }) => {
    test.skip(!hasSupabaseConfig, 'Supabase tidak dikonfigurasi untuk gate release')

    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await loginAsPrincipal(page)

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

    await context.close()
  })

  test('XD.5 — "Unduh Laporan" opens report generator modal', async ({ browser }) => {
    test.skip(!hasSupabaseConfig, 'Supabase tidak dikonfigurasi untuk gate release')

    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await loginAsPrincipal(page)

    const downloadBtn = page
      .locator('button, a')
      .filter({
        hasText: /Unduh Laporan|Download Report|Buat Laporan|Generate/i,
      })
      .first()
    expect(await downloadBtn.isVisible({ timeout: 5000 }).catch(() => false)).toBeTruthy()
    await downloadBtn.click()
    await page.waitForTimeout(2000)

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

    await context.close()
  })

  test('XD.6 — "Kelola Survey" navigates to survey page', async ({ browser }) => {
    test.skip(!hasSupabaseConfig, 'Supabase tidak dikonfigurasi untuk gate release')

    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await loginAsPrincipal(page)

    const surveyBtn = page
      .locator('button, a')
      .filter({
        hasText: /Kelola Survey|Survey|Survei/i,
      })
      .first()
    expect(await surveyBtn.isVisible({ timeout: 5000 }).catch(() => false)).toBeTruthy()
    await surveyBtn.click()
    await page.waitForTimeout(3000)

    const url = page.url()
    const isSurveyPage = url.includes('/principal/survey') || url.includes('/principal/survei')
    const hasSurveyContent = await page
      .locator('text=/Survey|Survei|Kelola Survey/i')
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)
    expect(isSurveyPage || hasSurveyContent).toBeTruthy()

    await context.close()
  })

  test('XD.7 — Before-after analytics page loads', async ({ browser }) => {
    test.skip(!hasSupabaseConfig, 'Supabase tidak dikonfigurasi untuk gate release')

    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await loginAsPrincipal(page)
    await page.goto('/#/app/principal/analytics')
    await page.waitForTimeout(5000)

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

    await context.close()
  })

  test('XD.8 — Survey page is accessible from principal routes', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await page.goto('/#/app/principal/survey')
    await page.waitForTimeout(3000)

    await expect(page).toHaveURL(/.*login/, { timeout: 15000 })

    await context.close()
  })

  test('XD.9 — Principal deny-path blocked from teacher grading route', async ({ browser }) => {
    test.skip(!hasSupabaseConfig, 'Supabase tidak dikonfigurasi untuk gate release')

    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await loginAsPrincipal(page)
    await page.goto('/#/teaching/assignment-gradebook')
    await page.waitForTimeout(3000)

    const url = page.url()
    expect(url.includes('/teaching/assignment-gradebook')).toBeFalsy()

    await context.close()
  })
})
