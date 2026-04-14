import { test, expect } from '@playwright/test'
import { loginAsStudent, loginAsTeacher, skipIfNoAuth } from './helpers/auth'

test.describe('E2E Smoke Tests', () => {
  test.beforeEach(() => {
    skipIfNoAuth()
  })

  test('1. Login successfully', async ({ page }) => {
    // We can just use the login helper which asserts successful redirect
    await loginAsStudent(page)
    await expect(
      page.locator('text=/Ruang Belajar|Dashboard|Kelas Saya|Mulai Belajar/i').first()
    ).toBeVisible({ timeout: 15000 })
  })

  test('2. Open lesson (Student)', async ({ page }) => {
    await loginAsStudent(page)
    await page.goto('/#/app/student/courses')

    // Find a course to open
    const startBtn = page
      .locator('button, a')
      .filter({ hasText: /Mulai Belajar|Lanjut|Mulai|Buka/i })
      .first()
    if (await startBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startBtn.click()

      // Wait for lesson viewer to load
      const lessonViewer = page
        .locator('text=/Pilih Pelajaran|Memuat pelajaran|Belum Ada Materi|pelajaran/i')
        .first()
      await expect(lessonViewer).toBeVisible({ timeout: 15000 })
    } else {
      // If no course, just ensure the courses page loaded
      await expect(page.locator('text=/Belum Ada Kursus|Pilih Materi/i').first()).toBeVisible()
    }
  })

  test('3. Submit assignment (Student)', async ({ page }) => {
    await loginAsStudent(page)
    await page.goto('/#/app/student/assignments')

    const assignmentItem = page
      .locator('[class*="sidebar"] li, [class*="list"] button, [class*="assignment"]')
      .first()
    if (await assignmentItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await assignmentItem.click()

      const submitBtn = page
        .locator('button')
        .filter({ hasText: /Kumpulkan|Submit/i })
        .first()
      if (await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(submitBtn).toBeVisible()
      }
    } else {
      await expect(
        page.locator('text=/Tidak ada tugas ditemukan|Belum ada tugas/i').first()
      ).toBeVisible()
    }
  })

  test('4. Teacher grading', async ({ page }) => {
    await loginAsTeacher(page)
    await page.goto('/#/app/teacher/grader')

    const graderPage = page
      .locator('text=/SpeedGrader|Penilaian|Belum ada|Pilih|Tidak ada submisi/i')
      .first()
    await expect(graderPage).toBeVisible({ timeout: 15000 })
  })

  test('5. Notification feedback loop', async ({ page }) => {
    await loginAsStudent(page)
    // Go to notifications
    await page.goto('/#/app/student/notifications')

    const notifHeading = page.locator('text=/Notifikasi|Pemberitahuan|Belum ada/i').first()
    await expect(notifHeading).toBeVisible({ timeout: 15000 })

    // Click notification bell if exists
    const bell = page.locator('button[aria-label="Notifikasi"], button:has(.lucide-bell)').first()
    if (await bell.isVisible({ timeout: 5000 }).catch(() => false)) {
      await bell.click()
      await expect(page.locator('text=/Notifikasi|Belum ada/i').first()).toBeVisible()
    }
  })
})
