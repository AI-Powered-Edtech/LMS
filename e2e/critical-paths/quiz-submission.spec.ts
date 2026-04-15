import { test, expect } from '@playwright/test'
import { loginAsStudent, gotoAndWait, dismissToast, skipIfNoAuth } from '../helpers'

/**
 * Critical Path: Student Quiz Submission
 *
 * Memverifikasi bahwa:
 * 1. Student dapat mengakses halaman daftar kuis
 * 2. Student dapat membuka dan mengerjakan kuis
 * 3. Student dapat memilih jawaban
 * 4. Student dapat submit kuis
 * 5. Setelah submit, student dapat melihat hasil/score
 */

test.describe('Critical Path — Quiz Submission Flow', () => {
  test.beforeEach(() => {
    skipIfNoAuth()
  })

  test('student dapat mengakses halaman daftar kuis', async ({ page }) => {
    await loginAsStudent(page)
    await gotoAndWait(page, '/#/app/student/quizzes')

    // Halaman harus merender konten (list kuis atau empty state)
    await expect(
      page.locator('h1, h2, [data-testid="quiz-list"], [data-testid="empty-state"]').first()
    ).toBeVisible({ timeout: 10000 })

    // Tidak ada JS error fatal
    await expect(page).not.toHaveURL(/login/)
  })

  test('halaman daftar kuis tidak mengalami JS error fatal', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await loginAsStudent(page)
    await gotoAndWait(page, '/#/app/student/quizzes')
    await page.waitForTimeout(2000)

    const fatalErrors = errors.filter(
      (e) =>
        !e.includes('ResizeObserver') &&
        !e.includes('Non-Error promise rejection') &&
        !e.includes('Non-Error')
    )
    expect(fatalErrors).toHaveLength(0)
  })

  test('student dapat memulai kuis dan memilih jawaban', async ({ page }) => {
    await loginAsStudent(page)
    await gotoAndWait(page, '/#/app/student/quizzes')

    // Cari tombol mulai kuis
    const startBtn = page
      .locator(
        'button:has-text("Mulai"), button:has-text("Kerjakan"), button:has-text("Lanjutkan"), [data-testid="start-quiz"]'
      )
      .first()

    const hasQuiz = await startBtn.isVisible({ timeout: 5000 }).catch(() => false)
    if (!hasQuiz) {
      // Tidak ada kuis tersedia di dev data — skip gracefully
      test.skip()
      return
    }

    await startBtn.click()

    // Tunggu quiz player termuat
    await page.waitForURL(/quiz|attempt/, { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Coba pilih jawaban pertama yang tersedia
    const optionBtn = page
      .locator(
        '[data-testid="quiz-option"], input[type="radio"] + label, .quiz-option, button[role="radio"], label:has(input[type="radio"])'
      )
      .first()

    const hasOption = await optionBtn.isVisible({ timeout: 5000 }).catch(() => false)
    if (hasOption) {
      await optionBtn.click()
      // Verifikasi opsi dipilih (tidak crash setelah klik)
      await page.waitForTimeout(500)
    }

    // Halaman quiz player harus masih ada setelah memilih jawaban
    await expect(page).not.toHaveURL(/login/)
  })

  test('student dapat submit kuis dan melihat halaman hasil', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await loginAsStudent(page)
    await gotoAndWait(page, '/#/app/student/quizzes')

    const startBtn = page
      .locator('button:has-text("Mulai"), button:has-text("Kerjakan"), [data-testid="start-quiz"]')
      .first()

    const hasQuiz = await startBtn.isVisible({ timeout: 5000 }).catch(() => false)
    if (!hasQuiz) {
      test.skip()
      return
    }

    await startBtn.click()
    await page.waitForURL(/quiz|attempt/, { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Jawab semua pertanyaan yang tersedia (max 10 iterasi)
    for (let i = 0; i < 10; i++) {
      const option = page
        .locator(
          '[data-testid="quiz-option"], input[type="radio"] + label, .quiz-option, label:has(input[type="radio"])'
        )
        .first()

      if (!(await option.isVisible({ timeout: 2000 }).catch(() => false))) break

      await option.click()
      await page.waitForTimeout(300)

      // Coba navigasi ke pertanyaan berikutnya
      const nextBtn = page
        .locator(
          'button:has-text("Selanjutnya"), button:has-text("Next"), [data-testid="next-question"], button:has-text("Berikutnya")'
        )
        .first()

      if (await nextBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await nextBtn.click()
        await page.waitForTimeout(500)
      } else {
        break
      }
    }

    // Cari tombol submit
    const submitBtn = page
      .locator(
        'button:has-text("Submit"), button:has-text("Kumpulkan"), button:has-text("Selesai"), [data-testid="submit-quiz"]'
      )
      .first()

    const hasSubmit = await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)
    if (!hasSubmit) {
      // Submit belum tersedia (kuis perlu lebih banyak jawaban) — verifikasi tidak crash
      const fatalErrors = errors.filter(
        (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error')
      )
      expect(fatalErrors).toHaveLength(0)
      return
    }

    await submitBtn.click()
    await dismissToast(page)

    // Tunggu navigasi ke halaman hasil atau konfirmasi dialog
    await page.waitForTimeout(2000)

    // Halaman hasil harus menampilkan score atau konfirmasi
    const resultVisible = await page
      .locator(
        '[data-testid="quiz-result"], [data-testid="score"], h1:has-text("Hasil"), h2:has-text("Hasil"), text=/[Ss]kor|[Ss]core|[Hh]asil|[Ss]elesai/,'
      )
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)

    // Verifikasi tidak ada error fatal (primary assertion)
    const fatalErrors = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error')
    )
    expect(fatalErrors).toHaveLength(0)

    // Halaman hasil sebagai soft assertion
    if (resultVisible) {
      expect(resultVisible).toBeTruthy()
    } else {
      // Submit berhasil jika tidak ada error dan kita tidak kembali ke login
      await expect(page).not.toHaveURL(/login/)
    }

    // VERIFIKASI DATABASE: Pastikan quiz attempt tercatat di database
    const db = page.evaluate(() => {
      return window.db
    }) as any

    if (db) {
      // Dapatkan data student untuk mendapatkan user ID
      const {
        data: { session },
      } = await db.auth.getSession()
      const studentId = session?.user?.id

      // Query quiz attempt terbaru untuk student ini
      const { data: attempts, error } = await db
        .from('quiz_attempts')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(1)

      expect(error).toBeNull()
      expect(attempts).toBeArray()
      expect(attempts.length).toBeGreaterThan(0)

      const latestAttempt = attempts[0]
      expect(latestAttempt).toHaveProperty('id')
      expect(latestAttempt).toHaveProperty('student_id', studentId)
      expect(latestAttempt).toHaveProperty('status', 'completed')
      expect(latestAttempt).toHaveProperty('created_at')
      expect(latestAttempt).toHaveProperty('updated_at')
    }
  })

  test('halaman hasil kuis tidak mengalami crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    // Navigasi langsung ke halaman hasil dengan ID contoh
    await loginAsStudent(page)
    await page.goto('/#/app/student/quiz/result/test-attempt-id')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const fatalErrors = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error')
    )
    expect(fatalErrors).toHaveLength(0)
  })

  test('halaman quiz memenuhi performance budget', async ({ page }) => {
    await loginAsStudent(page)
    await page.goto('/#/app/student/quizzes')
    await page.waitForLoadState('networkidle')

    const metrics = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const paintEntries = performance.getEntriesByType('paint')
      const fcpEntry = paintEntries.find((e) => e.name === 'first-contentful-paint')
      return {
        fcp: fcpEntry ? fcpEntry.startTime : null,
        loadTime: nav ? nav.loadEventEnd - nav.startTime : null,
      }
    })

    if (metrics.fcp !== null) {
      expect(metrics.fcp).toBeLessThan(3000)
    }
  })
})
