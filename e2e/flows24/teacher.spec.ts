import { test, expect } from '@playwright/test'

// Only run on teacher project
test.describe('Teacher Flows', () => {
  test.skip(() => test.info().project.name !== 'teacher', 'Only run for teacher')

  test('Flow 5: Course Builder', async ({ page }) => {
    await page.goto('/#/app/teacher/course-builder')
    await expect(
      page.locator('text=/Buat Kursus|Tambah Modul|Belum ada materi/i').first()
    ).toBeVisible({ timeout: 15000 })
  })

  test('Flow 7: Class Management', async ({ page }) => {
    await page.goto('/#/app/teacher/classes')
    await expect(page.locator('text=/Kelas|Daftar Kelas|Buat Kelas/i').first()).toBeVisible({
      timeout: 15000,
    })
  })

  test('Flow 9: Quiz Builder', async ({ page }) => {
    await page.goto('/#/app/teacher/quiz-manager')
    await expect(page.locator('text=/Kuis|Buat Kuis|Bank Soal/i').first()).toBeVisible({
      timeout: 15000,
    })
  })

  test('Flow 10: SpeedGrader', async ({ page }) => {
    await page.goto('/#/app/teacher/grader')
    await expect(page.locator('text=/SpeedGrader|Penilaian|Belum ada tugas/i').first()).toBeVisible(
      { timeout: 15000 }
    )
  })

  test('Flow 13: Teacher Analytics Dashboard', async ({ page }) => {
    await page.goto('/#/app/teacher/analytics')
    await expect(
      page.locator('text=/Analitik|Analytics|Pilih kursus untuk melihat/i').first()
    ).toBeVisible({ timeout: 15000 })
  })

  test('Flow 15: Gradebook', async ({ page }) => {
    await page.goto('/#/app/teacher/gradebook')
    await expect(page.locator('text=/Buku Nilai|Gradebook|Daftar Nilai/i').first()).toBeVisible({
      timeout: 15000,
    })
  })
})
