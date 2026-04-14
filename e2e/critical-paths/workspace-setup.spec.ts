import { test, expect } from '@playwright/test'
import { gotoAndWait, skipIfNoAuth } from '../helpers'

/**
 * Critical Path: Workspace Setup (Onboarding)
 *
 * Memverifikasi bahwa user baru (tanpa memberships) dapat:
 * 1. Melihat halaman workspace selector setelah login
 * 2. Memilih role (Murid/Guru/Admin)
 * 3. Mengisi form sesuai role
 * 4. Validasi form bekerja (field kosong, kode kelas)
 * 5. Navigasi antar step (back button)
 * 6. Sign out dari halaman onboarding
 *
 * Note: Tes ini tidak melakukan submit ke backend (karena akan membuat tenant/class baru).
 * Fokus pada UI flow dan validasi form.
 */

test.describe('Critical Path — Workspace Setup (Onboarding)', () => {
  test.beforeEach(() => {
    skipIfNoAuth()
  })

  test('halaman workspace selector menampilkan onboarding untuk user tanpa memberships', async ({
    page,
  }) => {
    // Langsung ke workspace selector
    await gotoAndWait(page, '/#/workspace-selector')

    // Harus menampilkan onboarding UI (bukan list memberships)
    const headingVisible = await page
      .locator('text=Selamat Datang di EduSync')
      .isVisible({ timeout: 10000 })
      .catch(() => false)

    // Jika heading tidak muncul, kemungkinan user sudah punya memberships → skip
    if (!headingVisible) {
      test.skip(true, 'User sudah memiliki memberships, onboarding flow tidak muncul')
      return
    }

    expect(headingVisible).toBeTruthy()

    // Harus ada 3 pilihan role
    await expect(page.locator('text=Murid')).toBeVisible()
    await expect(page.locator('text=Guru')).toBeVisible()
    await expect(page.locator('text=Admin Sekolah')).toBeVisible()
  })

  test('user dapat memilih role Murid dan melihat form join kelas', async ({ page }) => {
    await gotoAndWait(page, '/#/workspace-selector')

    // Cek apakah onboarding visible
    const headingVisible = await page
      .locator('text=Selamat Datang di EduSync')
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    if (!headingVisible) {
      test.skip(true, 'User sudah memiliki memberships')
      return
    }

    // Klik role Murid
    await page.locator('text=Murid').click()

    // Harus muncul form join kelas
    await expect(page.locator('text=Gabung sebagai Murid')).toBeVisible()
    await expect(page.locator('text=Kode Kelas')).toBeVisible()
    await expect(page.locator('input[placeholder="ABC123"]')).toBeVisible()

    // Tombol kembali harus ada
    await expect(page.locator('text=Kembali')).toBeVisible()
  })

  test('user dapat memilih role Guru dan melihat form buat sekolah', async ({ page }) => {
    await gotoAndWait(page, '/#/workspace-selector')

    const headingVisible = await page
      .locator('text=Selamat Datang di EduSync')
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    if (!headingVisible) {
      test.skip(true, 'User sudah memiliki memberships')
      return
    }

    // Klik role Guru
    await page.locator('text=Guru').click()

    // Harus muncul form buat sekolah
    await expect(page.locator('text=Daftar sebagai Guru')).toBeVisible()
    await expect(page.locator('text=Nama Sekolah')).toBeVisible()

    // Tombol kembali harus ada
    await expect(page.locator('text=Kembali')).toBeVisible()
  })

  test('user dapat memilih role Admin dan melihat form buat sekolah', async ({ page }) => {
    await gotoAndWait(page, '/#/workspace-selector')

    const headingVisible = await page
      .locator('text=Selamat Datang di EduSync')
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    if (!headingVisible) {
      test.skip(true, 'User sudah memiliki memberships')
      return
    }

    // Klik role Admin
    await page.locator('text=Admin Sekolah').click()

    // Harus muncul form buat sekolah (admin)
    await expect(page.locator('text=Daftar sebagai Admin')).toBeVisible()
    await expect(page.locator('text=Nama Sekolah')).toBeVisible()

    // Tombol kembali harus ada
    await expect(page.locator('text=Kembali')).toBeVisible()
  })

  test('navigasi kembali dari form ke pilihan role berfungsi', async ({ page }) => {
    await gotoAndWait(page, '/#/workspace-selector')

    const headingVisible = await page
      .locator('text=Selamat Datang di EduSync')
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    if (!headingVisible) {
      test.skip(true, 'User sudah memiliki memberships')
      return
    }

    // Masuk ke form Murid
    await page.locator('text=Murid').click()
    await expect(page.locator('text=Gabung sebagai Murid')).toBeVisible()

    // Klik kembali
    await page.locator('text=Kembali').click()

    // Harus kembali ke pilihan role
    await expect(page.locator('text=Saya adalah...')).toBeVisible()
    await expect(page.locator('text=Murid')).toBeVisible()
    await expect(page.locator('text=Guru')).toBeVisible()
    await expect(page.locator('text=Admin Sekolah')).toBeVisible()
  })

  test('kode kelas otomatis uppercase saat diketik', async ({ page }) => {
    await gotoAndWait(page, '/#/workspace-selector')

    const headingVisible = await page
      .locator('text=Selamat Datang di EduSync')
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    if (!headingVisible) {
      test.skip(true, 'User sudah memiliki memberships')
      return
    }

    // Masuk ke form Murid
    await page.locator('text=Murid').click()

    // Ketik kode kelas lowercase
    const codeInput = page.locator('input[placeholder="ABC123"]')
    await codeInput.fill('abc123')

    // Harus otomatis uppercase
    const value = await codeInput.inputValue()
    expect(value).toBe('ABC123')
  })

  test('kode kelas dibatasi maksimal 10 karakter', async ({ page }) => {
    await gotoAndWait(page, '/#/workspace-selector')

    const headingVisible = await page
      .locator('text=Selamat Datang di EduSync')
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    if (!headingVisible) {
      test.skip(true, 'User sudah memiliki memberships')
      return
    }

    await page.locator('text=Murid').click()

    const codeInput = page.locator('input[placeholder="ABC123"]')
    const maxLength = await codeInput.getAttribute('maxlength')
    expect(maxLength).toBe('10')
  })

  test('tombol submit menampilkan loading state saat isSubmitting', async ({ page }) => {
    await gotoAndWait(page, '/#/workspace-selector')

    const headingVisible = await page
      .locator('text=Selamat Datang di EduSync')
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    if (!headingVisible) {
      test.skip(true, 'User sudah memiliki memberships')
      return
    }

    await page.locator('text=Murid').click()

    // Isi form
    await page.locator('input[placeholder="Misal: Andi Pratama"]').fill('Test User')
    await page.locator('input[placeholder="ABC123"]').fill('TEST123')

    // Klik submit
    await page.locator('text=Gabung Kelas').click()

    // Harus ada loading indicator (spinner atau disabled state)
    const submitBtn = page.locator('text=Gabung Kelas')
    const isDisabled = await submitBtn.isDisabled()
    const hasSpinner = await page
      .locator('.animate-spin')
      .isVisible({ timeout: 2000 })
      .catch(() => false)

    // Minimal salah satu: disabled atau spinner
    expect(isDisabled || hasSpinner).toBeTruthy()

    // Tunggu error response (karena kode kelas tidak valid)
    await page.waitForTimeout(3000)

    // Harus ada toast error
    const errorToast = await page
      .locator('[role="status"], .toast, [data-testid="toast"]')
      .filter({ hasText: /tidak ditemukan|gagal|error/i })
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    // Atau alert/error message visible
    const hasErrorFeedback =
      errorToast ||
      (await page
        .locator('text=tidak ditemukan')
        .isVisible({ timeout: 2000 })
        .catch(() => false))
    expect(hasErrorFeedback).toBeTruthy()
  })

  test('tombol sign out tersedia di halaman onboarding', async ({ page }) => {
    await gotoAndWait(page, '/#/workspace-selector')

    const headingVisible = await page
      .locator('text=Selamat Datang di EduSync')
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    if (!headingVisible) {
      test.skip(true, 'User sudah memiliki memberships')
      return
    }

    await expect(page.locator('text=Gunakan Akun Lain')).toBeVisible()
  })

  test('halaman workspace selector tidak mengalami JS error fatal', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await gotoAndWait(page, '/#/workspace-selector')
    await page.waitForTimeout(2000)

    const fatalErrors = errors.filter(
      (e) =>
        !e.includes('ResizeObserver') &&
        !e.includes('Non-Error promise rejection') &&
        !e.includes('Non-Error')
    )
    expect(fatalErrors).toHaveLength(0)
  })
})
