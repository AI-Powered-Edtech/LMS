import { test, expect } from '@playwright/test'

test.describe('Teacher Flows', () => {
  test('Flow 5: Course Builder', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/course-builder')
    await expect(
      page.locator('text=/Buat Kursus|Tambah Modul|Belum ada materi/i').first()
    ).toBeVisible({ timeout: 15000 })
  })

  test('Flow 7: Class Management', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/classes')
    await expect(page.locator('text=/Kelas|Daftar Kelas|Buat Kelas/i').first()).toBeVisible({
      timeout: 15000,
    })
  })

  test('Flow 9: Quiz Builder', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/quiz-manager')
    await expect(page.locator('text=/Kuis|Buat Kuis|Bank Soal/i').first()).toBeVisible({
      timeout: 15000,
    })
  })

  test('Flow 10: SpeedGrader', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/grader')
    await expect(page.locator('text=/SpeedGrader|Penilaian|Belum ada/i').first()).toBeVisible({
      timeout: 15000,
    })
  })

  test('Flow 13: Teacher Analytics Dashboard', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/analytics')
    await expect(page.locator('text=/Analitik|Analytics|Pilih/i').first()).toBeVisible({
      timeout: 15000,
    })
  })

  test('Flow 15: Gradebook', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/gradebook')
    await expect(page.locator('text=/Buku Nilai|Gradebook|Daftar Nilai/i').first()).toBeVisible({
      timeout: 15000,
    })
  })
})
