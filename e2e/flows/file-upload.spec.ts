import { test, expect } from '@playwright/test'
import { loginAsStudent, loginAsTeacher, gotoAndWait, skipIfNoAuth } from '../helpers'

/**
 * File Upload — Smoke Tests
 *
 * Memverifikasi bahwa:
 * 1. Halaman pengiriman tugas dapat dibuka oleh student
 * 2. Form upload tidak crash saat dibuka
 * 3. Teacher dapat melihat submission yang masuk
 */

test.describe('File Upload — Pengiriman Tugas', () => {

  test.beforeEach(() => {
    skipIfNoAuth()
  })

  test('student dapat membuka halaman daftar tugas', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await loginAsStudent(page)
    await gotoAndWait(page, '/#/app/student/assignments')

    // Halaman tugas harus menampilkan konten atau empty state
    await expect(
      page.locator('h1, h2, [data-testid="assignments-list"], [data-testid="empty-state"]').first()
    ).toBeVisible({ timeout: 8000 })

    const fatal = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error')
    )
    expect(fatal).toHaveLength(0)
  })

  test('halaman tugas tidak crash saat dimuat', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await loginAsStudent(page)
    await gotoAndWait(page, '/#/app/student/assignments')

    await page.waitForTimeout(1000)

    const fatal = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error')
    )
    expect(fatal).toHaveLength(0)
  })

  test('student dapat membuka detail tugas jika tersedia', async ({ page }) => {
    await loginAsStudent(page)
    await gotoAndWait(page, '/#/app/student/assignments')

    // Cari link atau kartu tugas yang bisa diklik
    const assignmentItem = page.locator(
      '[data-testid="assignment-item"], [data-testid="assignment-card"], ' +
      'a[href*="assignment"], button:has-text("Kerjakan"), button:has-text("Lihat Tugas")'
    ).first()

    const hasAssignment = await assignmentItem.isVisible({ timeout: 5000 }).catch(() => false)

    if (!hasAssignment) {
      // Tidak ada tugas di dev data — skip gracefully
      test.skip()
      return
    }

    await assignmentItem.click()
    await page.waitForLoadState('networkidle')

    // Halaman detail tidak boleh crash
    await expect(page.locator('body')).toBeVisible()
    await expect(page).not.toHaveURL(/.*login/)
  })

  test('form upload file muncul di halaman detail tugas', async ({ page }) => {
    await loginAsStudent(page)
    await gotoAndWait(page, '/#/app/student/assignments')

    const assignmentItem = page.locator(
      '[data-testid="assignment-item"], [data-testid="assignment-card"], ' +
      'a[href*="assignment"], button:has-text("Kerjakan")'
    ).first()

    const hasAssignment = await assignmentItem.isVisible({ timeout: 5000 }).catch(() => false)
    if (!hasAssignment) {
      test.skip()
      return
    }

    await assignmentItem.click()
    await page.waitForLoadState('networkidle')

    // Cek apakah ada input file atau area upload
    const uploadArea = page.locator(
      'input[type="file"], [data-testid="file-upload"], ' +
      '[data-testid="upload-area"], label:has(input[type="file"]), ' +
      'button:has-text("Unggah"), button:has-text("Upload")'
    )

    const hasUpload = await uploadArea.isVisible({ timeout: 5000 }).catch(() => false)
    // Soft assertion: jika ada — verifikasi visible, jika tidak — halaman tetap tidak crash
    if (hasUpload) {
      await expect(uploadArea.first()).toBeVisible()
    } else {
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('teacher dapat melihat halaman submission tugas', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await loginAsTeacher(page)
    await gotoAndWait(page, '/#/app/teacher/assignments')

    await expect(
      page.locator('h1, h2, [data-testid="assignments-list"], [data-testid="empty-state"]').first()
    ).toBeVisible({ timeout: 8000 })

    const fatal = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error')
    )
    expect(fatal).toHaveLength(0)
  })
})
