import { test, expect } from '@playwright/test'

test.describe('Student Flows', () => {
  test('Flow 1 & 3: Role Switching & Tenant Guard', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/teacher/dashboard')
    await expect(page.locator('text=/Akses Ditolak|Unauthorized|Kembali/i').first()).toBeVisible({
      timeout: 15000,
    })
  })

  test('Flow 4: Course Browsing', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/courses')
    await expect(page.locator('text=/Kursus|Course|Belum ada|Lanjutkan/i').first()).toBeVisible({
      timeout: 15000,
    })
  })

  test('Flow 6: Smart Player / Lesson Viewer', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/courses')
    const startBtn = page.locator('button', { hasText: /Lanjut|Mulai/i }).first()
    if (await startBtn.isVisible()) {
      await startBtn.click()
      await expect(page).toHaveURL(/.*courses\/[a-zA-Z0-9-]/, { timeout: 15000 })
    }
  })

  test('Flow 8: Quiz Taking', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/quizzes')
    await expect(page.locator('text=/Kuis|Quiz|Belum ada|Mulai/i').first()).toBeVisible({
      timeout: 15000,
    })
  })

  test('Flow 11: Assignments', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/assignments')
    await expect(page.locator('text=/Tugas|Assignment|Tidak ada/i').first()).toBeVisible({
      timeout: 15000,
    })
  })

  test('Flow 12: Student Dashboard & Progress', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/dashboard')
    await expect(
      page.locator('text=/XP|Belum ada|Kelas Saya|Pencapaian Terbaru/i').first()
    ).toBeVisible({ timeout: 15000 })
  })

  test('Flow 14: Gamification (XP, Badges, Leaderboard)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/leaderboard')
    await expect(
      page.locator('text=/Leaderboard|Peringkat|Cuplikan|Belum ada/i').first()
    ).toBeVisible({ timeout: 15000 })
  })

  test('Flow 21: Attendance', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/attendance')
    await expect(
      page.locator('text=/Kehadiran|Absensi|Attendance|Belum ada/i').first()
    ).toBeVisible({ timeout: 15000 })
  })

  test('Flow 22: Certificates', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/certificates')
    await expect(page.locator('text=/Sertifikat|Certificates|Belum ada/i').first()).toBeVisible({
      timeout: 15000,
    })
  })

  test('Flow 24: AI Tutor', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/dashboard')
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
