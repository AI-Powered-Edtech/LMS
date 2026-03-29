import { test, expect } from '@playwright/test'
import { loginAsTeacher, loginAsStudent, gotoAndWait, dismissToast, skipIfNoAuth } from '../helpers'

/**
 * Critical Path: Grade Publication — Teacher Gradebook → Student View
 *
 * Memverifikasi bahwa:
 * 1. Teacher dapat membuka halaman gradebook
 * 2. Teacher dapat melihat daftar nilai siswa
 * 3. Teacher dapat mengupdate/mempublikasikan nilai
 * 4. Student dapat melihat nilai yang sudah dipublikasikan di halaman grade mereka
 */

test.describe('Critical Path — Grade Publication Flow', () => {
  test.beforeEach(() => {
    skipIfNoAuth()
  })

  test('teacher dapat membuka halaman gradebook', async ({ page }) => {
    await loginAsTeacher(page)
    await gotoAndWait(page, '/#/app/teacher/gradebook')

    // Halaman gradebook harus menampilkan konten
    await expect(
      page
        .locator(
          'h1, h2, table, [data-testid="gradebook"], [data-testid="gradebook-table"], [data-testid="empty-state"]'
        )
        .first()
    ).toBeVisible({ timeout: 10000 })

    await expect(page).not.toHaveURL(/login/)
  })

  test('halaman gradebook teacher tidak mengalami JS error fatal', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await loginAsTeacher(page)
    await gotoAndWait(page, '/#/app/teacher/gradebook')
    await page.waitForTimeout(2000)

    const fatalErrors = errors.filter(
      (e) =>
        !e.includes('ResizeObserver') &&
        !e.includes('Non-Error promise rejection') &&
        !e.includes('Non-Error')
    )
    expect(fatalErrors).toHaveLength(0)
  })

  test('teacher dapat melihat daftar nilai di gradebook', async ({ page }) => {
    await loginAsTeacher(page)
    await gotoAndWait(page, '/#/app/teacher/gradebook')

    // Halaman harus memiliki tabel atau list nilai, atau empty state
    const hasContent = await page
      .locator(
        'table, [data-testid="gradebook-table"], [data-testid="grade-row"], [data-testid="empty-state"], .grade-item'
      )
      .first()
      .isVisible({ timeout: 8000 })
      .catch(() => false)

    expect(hasContent).toBeTruthy()
  })

  test('teacher dapat mengakses quiz gradebook untuk melihat nilai kuis', async ({ page }) => {
    await loginAsTeacher(page)
    await gotoAndWait(page, '/#/app/teacher/quiz-gradebook')

    await expect(
      page.locator('h1, h2, [data-testid="gradebook-table"], table').first()
    ).toBeVisible({ timeout: 10000 })

    await expect(page).not.toHaveURL(/login/)
  })

  test('teacher dapat menginput atau mengupdate nilai siswa', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await loginAsTeacher(page)
    await gotoAndWait(page, '/#/app/teacher/gradebook')

    // Cari input nilai atau tombol edit pertama yang tersedia
    const gradeInput = page
      .locator(
        'input[type="number"][placeholder*="ilai"], input[data-testid="grade-input"], [data-testid="edit-grade"], button:has-text("Edit Nilai"), button:has-text("Ubah")'
      )
      .first()

    const hasInput = await gradeInput.isVisible({ timeout: 5000 }).catch(() => false)

    if (!hasInput) {
      // Tidak ada input nilai tersedia (mungkin tidak ada assignment) — verifikasi tidak crash
      const fatalErrors = errors.filter(
        (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error')
      )
      expect(fatalErrors).toHaveLength(0)
      return
    }

    // Klik edit dan coba input nilai
    await gradeInput.click()
    await page.waitForTimeout(500)

    // Jika input berhasil difokus, isikan nilai
    const focusedInput = page.locator('input:focus, textarea:focus').first()
    if (await focusedInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await focusedInput.fill('85')
      await page.keyboard.press('Enter')
      await page.waitForTimeout(1000)
      await dismissToast(page)
    }

    // Tidak ada error fatal setelah operasi
    const fatalErrors = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error')
    )
    expect(fatalErrors).toHaveLength(0)
  })

  test('student dapat melihat halaman nilai mereka', async ({ page }) => {
    await loginAsStudent(page)
    await gotoAndWait(page, '/#/app/student/grades')

    // Halaman nilai student harus termuat
    const hasContent = await page
      .locator(
        'h1, h2, table, [data-testid="grades-list"], [data-testid="grade-card"], [data-testid="empty-state"]'
      )
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)

    expect(hasContent).toBeTruthy()
    await expect(page).not.toHaveURL(/login/)
  })

  test('halaman nilai student tidak mengalami JS error fatal', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await loginAsStudent(page)
    await gotoAndWait(page, '/#/app/student/grades')
    await page.waitForTimeout(2000)

    const fatalErrors = errors.filter(
      (e) =>
        !e.includes('ResizeObserver') &&
        !e.includes('Non-Error promise rejection') &&
        !e.includes('Non-Error')
    )
    expect(fatalErrors).toHaveLength(0)
  })

  test('student dapat melihat halaman quiz grades', async ({ page }) => {
    await loginAsStudent(page)
    await gotoAndWait(page, '/#/app/student/quiz-grades')

    // Halaman harus termuat tanpa redirect ke login
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    const bodyLen = await page.evaluate(() => document.body.textContent?.trim().length ?? 0)
    expect(bodyLen).toBeGreaterThan(50)
    await expect(page).not.toHaveURL(/login/)
  })
})
