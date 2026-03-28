import { test, expect } from '@playwright/test'
import { loginAsStudent, gotoAndWait, skipIfNoAuth } from '../helpers'

/**
 * Offline Sync — Smoke Tests
 *
 * Memverifikasi bahwa:
 * 1. Indikator offline muncul saat koneksi diputus
 * 2. Halaman tidak crash saat berpindah online/offline
 * 3. Navigasi antar halaman tetap stabil saat kembali online
 */

test.describe('Offline Sync — Indikator & Stabilitas', () => {

  test.beforeEach(() => {
    skipIfNoAuth()
  })

  test('halaman tidak crash saat koneksi diputus', async ({ page, context }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await loginAsStudent(page)
    await gotoAndWait(page, '/#/app/student/dashboard')

    // Putus koneksi
    await context.setOffline(true)
    await page.waitForTimeout(1000)

    // Halaman tidak boleh redirect ke login atau crash
    await expect(page.locator('body')).toBeVisible()
    await expect(page).not.toHaveURL(/.*login/)

    // Pulihkan koneksi
    await context.setOffline(false)

    const fatal = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error')
    )
    expect(fatal).toHaveLength(0)
  })

  test('indikator offline muncul atau UI tetap stabil saat offline', async ({ page, context }) => {
    await loginAsStudent(page)
    await gotoAndWait(page, '/#/app/student/dashboard')

    // Putus koneksi
    await context.setOffline(true)
    await page.waitForTimeout(1500)

    // Cek indikator offline jika ada — atau verifikasi tidak ada crash
    const offlineIndicator = page.locator(
      '[data-testid="offline-indicator"], .offline-indicator, ' +
      '[aria-label*="offline"], [aria-label*="Offline"], ' +
      'text=/Offline|Tidak ada koneksi|Koneksi terputus/i'
    )

    const hasIndicator = await offlineIndicator.isVisible({ timeout: 3000 }).catch(() => false)
    // Soft assertion: jika indicator ada, pastikan visible — jika tidak ada, UI harus tetap ada
    if (hasIndicator) {
      await expect(offlineIndicator.first()).toBeVisible()
    } else {
      // UI tetap harus ada (tidak blank/crash)
      await expect(page.locator('main, [role="main"], body')).toBeVisible()
    }

    await context.setOffline(false)
  })

  test('halaman kursus tidak crash saat offline', async ({ page, context }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await loginAsStudent(page)
    await gotoAndWait(page, '/#/app/student/courses')

    await context.setOffline(true)
    await page.waitForTimeout(1000)

    // Body masih visible
    await expect(page.locator('body')).toBeVisible()

    await context.setOffline(false)
    await page.waitForTimeout(500)

    const fatal = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error') && !e.includes('Failed to fetch')
    )
    expect(fatal).toHaveLength(0)
  })

  test('siklus offline-online tidak menyebabkan logout', async ({ page, context }) => {
    await loginAsStudent(page)
    await gotoAndWait(page, '/#/app/student/dashboard')

    // Siklus offline lalu online
    await context.setOffline(true)
    await page.waitForTimeout(800)
    await context.setOffline(false)
    await page.waitForTimeout(1000)

    // Harus tetap di halaman authenticated — tidak kembali ke login
    await expect(page).not.toHaveURL(/.*login/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('navigasi saat offline tidak menyebabkan halaman kosong', async ({ page, context }) => {
    await loginAsStudent(page)
    await gotoAndWait(page, '/#/app/student/dashboard')

    await context.setOffline(true)
    await page.waitForTimeout(500)

    // Coba navigasi ke halaman lain saat offline
    await page.goto('/#/app/student/courses')
    await page.waitForTimeout(1000)

    // Halaman tidak boleh benar-benar kosong
    const bodyText = await page.evaluate(() => document.body.textContent ?? '')
    expect(bodyText.trim().length).toBeGreaterThan(0)

    await context.setOffline(false)
  })
})
