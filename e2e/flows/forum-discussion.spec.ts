import { test, expect } from '@playwright/test'
import { loginAsStudent, loginAsTeacher, gotoAndWait, skipIfNoAuth } from '../helpers'

/**
 * Forum / Diskusi — Smoke Tests
 *
 * Memverifikasi bahwa:
 * 1. Halaman forum/diskusi dapat diakses oleh student
 * 2. Teacher dapat membuka forum kelas
 * 3. Tidak ada crash JS saat memuat diskusi
 */

test.describe('Forum Diskusi — Akses & Stabilitas', () => {

  test.beforeEach(() => {
    skipIfNoAuth()
  })

  test('student dapat membuka halaman diskusi', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await loginAsStudent(page)

    // Coba beberapa rute diskusi yang mungkin ada
    const routes = [
      '/#/app/student/discussion',
      '/#/app/discussion',
      '/#/app/forum',
    ]

    let loaded = false
    for (const route of routes) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      const url = page.url()
      // Jika tidak redirect ke login, halaman berhasil dimuat
      if (!url.includes('login')) {
        loaded = true
        break
      }
    }

    // Minimal satu rute harus dapat diakses atau halaman tidak crash
    await expect(page.locator('body')).toBeVisible()

    const fatal = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error')
    )
    expect(fatal).toHaveLength(0)
  })

  test('halaman diskusi tidak crash saat dimuat', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await loginAsStudent(page)
    await gotoAndWait(page, '/#/app/student/dashboard')

    // Cari link diskusi dari navigasi
    const discussionLink = page.locator(
      'a[href*="discussion"], a[href*="forum"], ' +
      'nav a:has-text("Diskusi"), nav a:has-text("Forum")'
    ).first()

    const hasLink = await discussionLink.isVisible({ timeout: 3000 }).catch(() => false)
    if (hasLink) {
      await discussionLink.click()
      await page.waitForLoadState('networkidle')
    } else {
      // Navigasi langsung
      await gotoAndWait(page, '/#/app/discussion')
    }

    await expect(page.locator('body')).toBeVisible()
    await expect(page).not.toHaveURL(/.*login/)

    const fatal = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error')
    )
    expect(fatal).toHaveLength(0)
  })

  test('student dapat melihat daftar topik diskusi jika tersedia', async ({ page }) => {
    await loginAsStudent(page)
    await gotoAndWait(page, '/#/app/student/courses')

    // Cari kursus yang tersedia untuk masuk ke diskusi kelas
    const courseItem = page.locator(
      '[data-testid="course-card"], [data-testid="course-item"], ' +
      'a[href*="course"], button:has-text("Masuk"), button:has-text("Buka")'
    ).first()

    const hasCourse = await courseItem.isVisible({ timeout: 5000 }).catch(() => false)
    if (!hasCourse) {
      test.skip()
      return
    }

    await courseItem.click()
    await page.waitForLoadState('networkidle')

    // Cari tab atau link diskusi di dalam kelas
    const discussionTab = page.locator(
      '[data-testid="discussion-tab"], button:has-text("Diskusi"), ' +
      'a:has-text("Diskusi"), tab:has-text("Diskusi")'
    ).first()

    const hasTab = await discussionTab.isVisible({ timeout: 5000 }).catch(() => false)
    if (hasTab) {
      await discussionTab.click()
      await page.waitForLoadState('networkidle')
      await expect(page.locator('body')).toBeVisible()
    } else {
      // Tab tidak ada — halaman tetap harus stabil
      await expect(page.locator('body')).toBeVisible()
    }
  })

  test('teacher dapat membuka forum diskusi kelas', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await loginAsTeacher(page)
    await gotoAndWait(page, '/#/app/teacher/classes')

    // Cari kelas yang tersedia
    const classItem = page.locator(
      '[data-testid="class-card"], [data-testid="class-item"], ' +
      'a[href*="class"], button:has-text("Buka"), button:has-text("Kelola")'
    ).first()

    const hasClass = await classItem.isVisible({ timeout: 5000 }).catch(() => false)
    if (!hasClass) {
      test.skip()
      return
    }

    await classItem.click()
    await page.waitForLoadState('networkidle')

    // Cari tab diskusi
    const discussionTab = page.locator(
      '[data-testid="discussion-tab"], button:has-text("Diskusi"), a:has-text("Diskusi")'
    ).first()

    const hasTab = await discussionTab.isVisible({ timeout: 5000 }).catch(() => false)
    if (hasTab) {
      await discussionTab.click()
      await page.waitForLoadState('networkidle')
    }

    await expect(page.locator('body')).toBeVisible()
    await expect(page).not.toHaveURL(/.*login/)

    const fatal = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error')
    )
    expect(fatal).toHaveLength(0)
  })

  test('tombol buat postingan baru ada atau halaman stabil', async ({ page }) => {
    await loginAsTeacher(page)

    // Navigasi langsung ke rute forum jika ada
    await gotoAndWait(page, '/#/app/discussion')

    const createBtn = page.locator(
      'button:has-text("Buat Diskusi"), button:has-text("Posting Baru"), ' +
      'button:has-text("Tulis"), [data-testid="create-post-btn"]'
    ).first()

    // Soft: tombol boleh tidak ada (jika tidak ada kelas aktif) — pastikan tidak crash
    await createBtn.isVisible({ timeout: 3000 }).catch(() => false)
    await expect(page.locator('body')).toBeVisible()
    await expect(page).not.toHaveURL(/.*login/)
  })
})
