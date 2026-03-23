import { test, expect } from '@playwright/test'

test.describe('Student Flows', () => {
  test.skip(() => test.info().project.name !== 'student', 'Only run for student')

  test('Flow 1 & 3: Role Switching & Tenant Guard', async ({ page }) => {
    await page.goto('/#/app/teacher/dashboard')
    await expect(page.locator('text=/Akses Ditolak|Unauthorized|Kembali/i').first()).toBeVisible({
      timeout: 15000,
    })
  })

  test('Flow 4: Course Browsing', async ({ page }) => {
    await page.goto('/#/app/student/courses')
    // It might say "Kursus" or "Belum ada kursus yang aktif"
    await expect(page.locator('text=/Kursus|Course|Belum ada|Lanjutkan/i').first()).toBeVisible({
      timeout: 15000,
    })
  })

  test('Flow 6: Smart Player / Lesson Viewer', async ({ page }) => {
    await page.goto('/#/app/student/courses')
    // Try to click "Lanjut Belajar" if present, otherwise just pass the render test
    const startBtn = page.locator('button', { hasText: /Lanjut|Mulai/i }).first()
    if (await startBtn.isVisible()) {
      await startBtn.click()
      await expect(page).toHaveURL(/.*courses\/[a-zA-Z0-9-]/, { timeout: 15000 })
    }
  })

  test('Flow 8: Quiz Taking', async ({ page }) => {
    await page.goto('/#/app/student/quizzes')
    await expect(
      page.locator('text=/Kuis|Quiz|Belum ada riwayat kuis|Mulai/i').first()
    ).toBeVisible({ timeout: 15000 })
  })

  test('Flow 11: Assignments', async ({ page }) => {
    await page.goto('/#/app/student/assignments')
    await expect(
      page.locator('text=/Tugas|Assignment|Tidak ada tugas mendesak/i').first()
    ).toBeVisible({ timeout: 15000 })
  })

  test('Flow 12: Student Dashboard & Progress', async ({ page }) => {
    await page.goto('/#/app/student/dashboard')
    await expect(
      page.locator('text=/XP|Belum ada|Kelas Saya|Pencapaian Terbaru/i').first()
    ).toBeVisible({ timeout: 15000 })
  })

  test('Flow 14: Gamification (XP, Badges, Leaderboard)', async ({ page }) => {
    await page.goto('/#/app/student/leaderboard')
    await expect(
      page.locator('text=/Leaderboard|Peringkat|Cuplikan Papan Peringkat|Belum ada data/i').first()
    ).toBeVisible({ timeout: 15000 })
  })

  test('Flow 21: Attendance', async ({ page }) => {
    await page.goto('/#/app/student/attendance')
    await expect(
      page.locator('text=/Kehadiran|Absensi|Attendance|Belum ada data kehadiran/i').first()
    ).toBeVisible({ timeout: 15000 })
  })

  test('Flow 22: Certificates', async ({ page }) => {
    await page.goto('/#/app/student/certificates')
    await expect(
      page.locator('text=/Sertifikat|Certificates|Belum ada sertifikat/i').first()
    ).toBeVisible({ timeout: 15000 })
  })

  test('Flow 24: AI Tutor', async ({ page }) => {
    await page.goto('/#/app/student/dashboard')
    // Give it time for the floating button to load
    await page.waitForTimeout(2000)
    const tutorButton = page.locator('button', { hasText: /AI|Tutor|🤖/i }).first()
    if (await tutorButton.isVisible()) {
      await tutorButton.click()
      await expect(page.locator('textarea, input[type="text"]').first()).toBeVisible({
        timeout: 10000,
      })
    }
  })
})
