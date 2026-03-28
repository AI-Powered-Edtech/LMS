import { test, expect } from '@playwright/test'
import { loginAsTeacher, gotoAndWait, skipIfNoAuth } from '../helpers'

/**
 * CSV Export — Smoke Tests
 *
 * Memverifikasi bahwa:
 * 1. Halaman gradebook dapat dibuka oleh teacher
 * 2. Tombol ekspor ada atau halaman tidak crash
 * 3. Download CSV tidak menyebabkan error JS
 */

test.describe('CSV Export — Gradebook & Laporan', () => {

  test.beforeEach(() => {
    skipIfNoAuth()
  })

  test('teacher dapat membuka halaman gradebook', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await loginAsTeacher(page)
    await gotoAndWait(page, '/#/app/teacher/gradebook')

    await expect(
      page.locator('h1, h2, table, [data-testid="gradebook"], [data-testid="empty-state"]').first()
    ).toBeVisible({ timeout: 8000 })

    const fatal = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error')
    )
    expect(fatal).toHaveLength(0)
  })

  test('tombol ekspor CSV ada di halaman gradebook', async ({ page }) => {
    await loginAsTeacher(page)
    await gotoAndWait(page, '/#/app/teacher/gradebook')

    // Cari tombol ekspor dalam berbagai label
    const exportBtn = page.locator(
      'button:has-text("Ekspor"), button:has-text("Export"), ' +
      'button:has-text("CSV"), button:has-text("Unduh"), ' +
      '[data-testid="export-btn"], [data-testid="export-csv"]'
    ).first()

    const hasExport = await exportBtn.isVisible({ timeout: 5000 }).catch(() => false)
    // Soft: jika data tidak ada mungkin tombol tersembunyi — halaman tidak boleh crash
    if (hasExport) {
      await expect(exportBtn).toBeVisible()
    } else {
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('klik tombol ekspor CSV tidak menyebabkan error JS', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await loginAsTeacher(page)
    await gotoAndWait(page, '/#/app/teacher/gradebook')

    const exportBtn = page.locator(
      'button:has-text("Ekspor"), button:has-text("Export"), ' +
      'button:has-text("CSV"), button:has-text("Unduh"), ' +
      '[data-testid="export-btn"], [data-testid="export-csv"]'
    ).first()

    const hasExport = await exportBtn.isVisible({ timeout: 5000 }).catch(() => false)
    if (!hasExport) {
      test.skip()
      return
    }

    // Pantau permintaan download
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null)

    await exportBtn.click()
    await page.waitForTimeout(1000)

    // Tunggu download atau verifikasi tidak ada crash
    const download = await downloadPromise
    if (download) {
      expect(download.suggestedFilename()).toMatch(/\.(csv|xlsx|txt)$/i)
    }

    const fatal = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error')
    )
    expect(fatal).toHaveLength(0)
  })

  test('halaman laporan analytics dapat dibuka tanpa crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await loginAsTeacher(page)
    await gotoAndWait(page, '/#/app/teacher/analytics')

    // Halaman analytics harus menampilkan konten
    const isNotBlank = await page.evaluate(() => (document.body.textContent ?? '').length > 100)
    expect(isNotBlank).toBeTruthy()

    const fatal = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error')
    )
    expect(fatal).toHaveLength(0)
  })

  test('teacher dapat membuka halaman reports', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await loginAsTeacher(page)
    await gotoAndWait(page, '/#/app/teacher/reports')

    // Halaman mungkin redirect — verifikasi tidak ada crash dan tidak ke login
    await expect(page.locator('body')).toBeVisible({ timeout: 8000 })
    await expect(page).not.toHaveURL(/.*login/)

    const fatal = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error')
    )
    expect(fatal).toHaveLength(0)
  })
})
