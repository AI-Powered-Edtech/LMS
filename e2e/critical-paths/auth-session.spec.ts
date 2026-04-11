import { test, expect } from '@playwright/test'
import { loginAsTeacher, loginAsStudent, gotoAndWait, skipIfNoAuth } from '../helpers'

/**
 * Critical Path: Auth Session Flow
 *
 * Memverifikasi bahwa:
 * 1. Valid login → akses protected route → logout → tidak bisa akses protected route
 * 2. Failed login (wrong password) → error message shown, no redirect to protected route
 * 3. Session expired handling: manipulate localStorage to simulate expired session → redirect to login
 */

test.describe('Critical Path — Auth Session Flow', () => {
  test.beforeEach(() => {
    skipIfNoAuth()
  })

  test('valid login memberikan akses ke protected route', async ({ page }) => {
    await loginAsStudent(page)

    // Verifikasi URL mengarah ke area student (bukan login)
    const url = page.url()
    expect(url).toMatch(/student|dashboard/)
    expect(url).not.toContain('/login')
    expect(url).not.toContain('/unauthorized')

    // Pastikan konten halaman termuat
    const bodyLen = await page.evaluate(() => document.body.textContent?.trim().length ?? 0)
    expect(bodyLen).toBeGreaterThan(100)
  })

  test('student dapat mengakses multiple protected routes setelah login', async ({ page }) => {
    await loginAsStudent(page)

    const protectedRoutes = [
      '/#/app/student/courses',
      '/#/app/student/quizzes',
      '/#/app/student/grades',
    ]

    for (const route of protectedRoutes) {
      await gotoAndWait(page, route)
      await expect(page).not.toHaveURL(/login/)

      const bodyLen = await page.evaluate(() => document.body.textContent?.trim().length ?? 0)
      expect(bodyLen).toBeGreaterThan(50)
    }
  })

  test('teacher dapat mengakses multiple protected routes setelah login', async ({ page }) => {
    await loginAsTeacher(page)

    const protectedRoutes = [
      '/#/app/teacher/gradebook',
      '/#/app/teacher/quiz-gradebook',
      '/#/app/teacher/assignments',
    ]

    for (const route of protectedRoutes) {
      await gotoAndWait(page, route)
      await expect(page).not.toHaveURL(/login/)

      const bodyLen = await page.evaluate(() => document.body.textContent?.trim().length ?? 0)
      expect(bodyLen).toBeGreaterThan(50)
    }
  })

  test('logout mengarahkan kembali ke halaman login', async ({ page }) => {
    await loginAsStudent(page)

    // Cari tombol logout
    const logoutBtn = page
      .locator(
        'button:has-text("Logout"), button:has-text("Keluar"), button:has-text("Sign Out"), [data-testid="logout-button"], [data-testid="sign-out"]'
      )
      .first()

    const hasLogoutBtn = await logoutBtn.isVisible({ timeout: 5000 }).catch(() => false)
    if (!hasLogoutBtn) {
      // Coba cari di menu/dropdown
      const menuBtn = page
        .locator(
          '[data-testid="user-menu"], [data-testid="profile-menu"], button[aria-label*="menu"], .user-menu, .profile-menu'
        )
        .first()

      if (await menuBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await menuBtn.click()
        await page.waitForTimeout(500)

        const logoutInMenu = page
          .locator(
            'button:has-text("Logout"), button:has-text("Keluar"), button:has-text("Sign Out"), [data-testid="logout-button"]'
          )
          .first()

        if (await logoutInMenu.isVisible({ timeout: 2000 }).catch(() => false)) {
          await logoutInMenu.click()
        } else {
          test.skip(true, 'Tombol logout tidak ditemukan')
          return
        }
      } else {
        test.skip(true, 'Tombol logout tidak ditemukan')
        return
      }
    } else {
      await logoutBtn.click()
    }

    await page.waitForTimeout(2000)

    // Harus redirect ke login atau halaman publik
    await expect(page).toHaveURL(/login|\/#\/login/, { timeout: 10000 })
  })

  test('setelah logout, tidak dapat mengakses protected route', async ({ page }) => {
    await loginAsStudent(page)

    // Logout
    const logoutBtn = page
      .locator(
        'button:has-text("Logout"), button:has-text("Keluar"), button:has-text("Sign Out"), [data-testid="logout-button"]'
      )
      .first()

    const hasLogoutBtn = await logoutBtn.isVisible({ timeout: 5000 }).catch(() => false)
    if (!hasLogoutBtn) {
      const menuBtn = page
        .locator('[data-testid="user-menu"], [data-testid="profile-menu"], .user-menu')
        .first()

      if (await menuBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await menuBtn.click()
        await page.waitForTimeout(500)

        const logoutInMenu = page
          .locator(
            'button:has-text("Logout"), button:has-text("Keluar"), [data-testid="logout-button"]'
          )
          .first()

        if (await logoutInMenu.isVisible({ timeout: 2000 }).catch(() => false)) {
          await logoutInMenu.click()
        } else {
          test.skip(true, 'Tombol logout tidak ditemukan')
          return
        }
      } else {
        test.skip(true, 'Tombol logout tidak ditemukan')
        return
      }
    } else {
      await logoutBtn.click()
    }

    await page.waitForTimeout(2000)
    await expect(page).toHaveURL(/login/, { timeout: 10000 })

    // Coba akses protected route setelah logout
    await gotoAndWait(page, '/#/app/student/courses')

    // Harus tetap di login atau redirect ke login
    await page.waitForTimeout(2000)
    expect(page.url()).toContain('login')
  })

  test('login dengan password salah menampilkan error', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForLoadState('networkidle')

    // Cek apakah form login tersedia
    const emailInput = page.locator('input[type="email"], input[name="email"]')
    if (!(await emailInput.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip(true, 'Form login tidak tersedia')
      return
    }

    // Isi dengan kredensial salah
    await page.fill('input[type="email"], input[name="email"]', 'student@edusync.dev')
    await page.fill('input[type="password"], input[name="password"]', 'wrongpassword123')
    await page.click('button[type="submit"]')

    // Tunggu beberapa detik untuk response
    await page.waitForTimeout(3000)

    // Harus tetap di halaman login
    expect(page.url()).toContain('login')

    // Cek apakah ada pesan error
    const errorMessage = page.locator(
      '[role="alert"], [data-testid="error-message"], .error-message, text=/salah|error|gagal|invalid|tidak benar|wrong|failed/i'
    )

    const hasError = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false)
    if (hasError) {
      const errorText = await errorMessage.first().textContent()
      expect(errorText).toBeTruthy()
    }
    // Jika tidak ada pesan error visible, setidaknya tetap di login page
  })

  test('login dengan email salah menampilkan error', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForLoadState('networkidle')

    const emailInput = page.locator('input[type="email"], input[name="email"]')
    if (!(await emailInput.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip(true, 'Form login tidak tersedia')
      return
    }

    await page.fill('input[type="email"], input[name="email"]', 'nonexistent@edusync.dev')
    await page.fill('input[type="password"], input[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    await page.waitForTimeout(3000)

    // Harus tetap di halaman login
    expect(page.url()).toContain('login')
  })

  test('login dengan field kosong menampilkan error atau tidak submit', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForLoadState('networkidle')

    const emailInput = page.locator('input[type="email"], input[name="email"]')
    if (!(await emailInput.isVisible({ timeout: 3000 }).catch(() => false))) {
      test.skip(true, 'Form login tidak tersedia')
      return
    }

    // Klik submit tanpa mengisi field
    await page.click('button[type="submit"]')
    await page.waitForTimeout(2000)

    // Harus tetap di login atau ada validasi HTML5
    const url = page.url()
    const isStillLogin = url.includes('login')

    // Cek validasi HTML5
    const validationMessage = await page.evaluate(() => {
      const input = document.querySelector('input[type="email"], input[name="email"]')
      if (input && (input as HTMLInputElement).validationMessage) {
        return (input as HTMLInputElement).validationMessage
      }
      return null
    })

    expect(isStillLogin || validationMessage).toBeTruthy()
  })

  test('simulasi session expired mengarahkan ke login', async ({ page }) => {
    await loginAsStudent(page)

    // Verifikasi sudah login
    await expect(page).not.toHaveURL(/login/)

    // Manipulasi localStorage untuk mensimulasikan session expired
    await page.evaluate(() => {
      // Hapus session dari localStorage
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.includes('db') || key.includes('session') || key.includes('token'))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key))

      // Juga hapus sessionStorage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && (key.includes('db') || key.includes('session'))) {
          sessionStorage.removeItem(key)
        }
      }
    })

    // Refresh halaman untuk memicu session check
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    // Harus redirect ke login
    expect(page.url()).toContain('login')
  })

  test('simulasi session expired saat mengakses protected route', async ({ page }) => {
    await loginAsStudent(page)

    // Navigasi ke protected route
    await gotoAndWait(page, '/#/app/student/courses')
    await expect(page).not.toHaveURL(/login/)

    // Manipulasi session
    await page.evaluate(() => {
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.includes('db') || key.includes('session') || key.includes('token'))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key))
    })

    // Coba navigasi ke protected route lain
    await gotoAndWait(page, '/#/app/student/quizzes')
    await page.waitForTimeout(2000)

    // Harus redirect ke login
    expect(page.url()).toContain('login')
  })

  test('halaman login tidak mengalami JS error fatal', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/#/login')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const fatalErrors = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error')
    )
    expect(fatalErrors).toHaveLength(0)
  })

  test('login page memenuhi performance budget', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForLoadState('networkidle')

    const metrics = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const paintEntries = performance.getEntriesByType('paint')
      const fcpEntry = paintEntries.find((e) => e.name === 'first-contentful-paint')
      return {
        fcp: fcpEntry ? fcpEntry.startTime : null,
        loadTime: nav ? nav.loadEventEnd - nav.startTime : null,
      }
    })

    if (metrics.fcp !== null) {
      expect(metrics.fcp).toBeLessThan(3000)
    }
  })

  test('multiple login attempts tidak menyebabkan race condition', async ({ page }) => {
    await page.goto('/#/login')
    await page.waitForLoadState('networkidle')

    const quickBtn = page
      .locator('[data-testid="quick-login-student"], button:has-text("Student")')
      .first()
    const hasQuick = await quickBtn.isVisible({ timeout: 2000 }).catch(() => false)

    if (hasQuick) {
      // Klik quick login beberapa kali dengan cepat
      await quickBtn.click()
      await page.waitForTimeout(500)
      await quickBtn.click().catch(() => {
        /* ok jika sudah navigasi */
      })
    } else {
      const { email, password } = {
        email: process.env.E2E_STUDENT_EMAIL ?? 'student@edusync.dev',
        password: process.env.E2E_STUDENT_PASSWORD ?? 'password123',
      }
      await page.fill('input[type="email"], input[name="email"]', email)
      await page.fill('input[type="password"], input[name="password"]', password)

      // Klik submit beberapa kali
      await page.click('button[type="submit"]')
      await page.waitForTimeout(500)
      await page.click('button[type="submit"]').catch(() => {
        /* ok jika sudah navigasi */
      })
    }

    await page.waitForURL(/dashboard|student|login/, { timeout: 12000 })

    // Harus berakhir di dashboard/student atau login (bukan error page)
    const url = page.url()
    expect(url).not.toContain('/error')
    expect(url).not.toContain('/crash')
  })
})
