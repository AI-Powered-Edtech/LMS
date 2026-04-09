import { test, expect } from '@playwright/test'
import { loginAsStudent, gotoAndWait, skipIfNoAuth } from '../helpers'

/**
 * Critical Path: Student Login → Dashboard → Assigned Courses
 *
 * Memverifikasi bahwa:
 * 1. Student dapat login dengan kredensial yang valid
 * 2. Setelah login, student diarahkan ke dashboard (bukan halaman login)
 * 3. Student dapat melihat daftar kursus yang di-assign kepadanya
 * 4. Halaman tidak mengalami crash (tidak ada JS error fatal)
 */

test.describe('Critical Path — Student Login & Dashboard', () => {
  test.beforeEach(() => {
    skipIfNoAuth()
  })

  test('student dapat login dengan email dan password yang valid', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForLoadState('networkidle')

    // Coba quick-login button (dev mode) atau form manual
    const quickBtn = page
      .locator('[data-testid="quick-login-student"], button:has-text("Student")')
      .first()
    const hasQuick = await quickBtn.isVisible({ timeout: 2000 }).catch(() => false)

    if (hasQuick) {
      await quickBtn.click()
    } else {
      await page.fill('input[type="email"], input[name="email"]', 'student@edusync.dev')
      await page.fill('input[type="password"], input[name="password"]', 'password123')
      await page.click('button[type="submit"]')
    }

    // Harus redirect ke halaman student (bukan tetap di login)
    await page.waitForURL(/dashboard|student/, { timeout: 12000 })
    await expect(page).not.toHaveURL(/login/)

    // Verifikasi data di database: token dan role
    const supabase = page.evaluate(() => {
      return window.supabase
    }) as any

    if (supabase) {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      expect(session?.user?.email).toBe('student@edusync.dev')
      expect(session?.user?.role).toBe('student')
    }
  })

  test('setelah login, student diarahkan ke dashboard student', async ({ page }) => {
    await loginAsStudent(page)

    // Verifikasi URL mengarah ke area student
    const url = page.url()
    expect(url).toMatch(/student|dashboard/)
    expect(url).not.toContain('/login')
    expect(url).not.toContain('/unauthorized')

    // Pastikan konten halaman termuat (bukan blank)
    const bodyLen = await page.evaluate(() => document.body.textContent?.trim().length ?? 0)
    expect(bodyLen).toBeGreaterThan(100)

    // Verifikasi data di database: token dan role
    const supabase = page.evaluate(() => {
      return window.supabase
    }) as any

    if (supabase) {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      expect(session?.user?.email).toBe('student@edusync.dev')
      expect(session?.user?.role).toBe('student')
    }
  })

  test('student dapat melihat daftar kursus yang di-assign', async ({ page }) => {
    await loginAsStudent(page)
    await gotoAndWait(page, '/#/app/student/courses')

    // Halaman kursus harus menampilkan konten — baik list kursus maupun empty state
    const contentVisible = await page
      .locator(
        'h1, h2, [data-testid="courses-list"], [data-testid="empty-state"], .course-card, [data-testid="course-card"]'
      )
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)

    expect(contentVisible).toBeTruthy()

    // Tidak ada error fatal
    await expect(page).not.toHaveURL(/login/)
  })

  test('halaman dashboard student tidak mengalami JS error fatal', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await loginAsStudent(page)
    await gotoAndWait(page, '/#/app/student/dashboard')
    await page.waitForTimeout(2000)

    const fatalErrors = errors.filter(
      (e) =>
        !e.includes('ResizeObserver') &&
        !e.includes('Non-Error promise rejection') &&
        !e.includes('Non-Error')
    )
    expect(fatalErrors).toHaveLength(0)
  })

  test('login dengan kredensial salah tidak melakukan redirect', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForLoadState('networkidle')

    // Gunakan form manual untuk tes kredensial salah
    const emailInput = page.locator('input[type="email"], input[name="email"]')
    if (!(await emailInput.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip()
      return
    }

    await page.fill('input[type="email"], input[name="email"]', 'salah@edusync.dev')
    await page.fill('input[type="password"], input[name="password"]', 'passwordsalah')
    await page.click('button[type="submit"]')

    // Harus tetap di halaman login
    await page.waitForTimeout(3000)
    expect(page.url()).toContain('login')
  })

  test('student dapat melihat navigasi utama setelah login', async ({ page }) => {
    await loginAsStudent(page)

    // Cek bahwa ada elemen navigasi (sidebar, navbar, atau menu utama)
    const navVisible = await page
      .locator('nav, [role="navigation"], aside, [data-testid="sidebar"], [data-testid="navbar"]')
      .first()
      .isVisible({ timeout: 8000 })
      .catch(() => false)

    expect(navVisible).toBeTruthy()
  })

  test('login memenuhi performance budget', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForLoadState('networkidle')

    // Ambil performance metrics
    const metrics = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const paintEntries = performance.getEntriesByType('paint')
      const fcpEntry = paintEntries.find((e) => e.name === 'first-contentful-paint')
      return {
        fcp: fcpEntry ? fcpEntry.startTime : null,
        loadTime: nav ? nav.loadEventEnd - nav.startTime : null,
        domInteractive: nav ? nav.domInteractive - nav.startTime : null,
      }
    })

    // FCP harus < 3000ms (relaxed untuk dev environment)
    if (metrics.fcp !== null) {
      expect(metrics.fcp).toBeLessThan(3000)
    }

    // DOM interactive harus < 5000ms
    if (metrics.domInteractive !== null) {
      expect(metrics.domInteractive).toBeLessThan(5000)
    }
  })
})
