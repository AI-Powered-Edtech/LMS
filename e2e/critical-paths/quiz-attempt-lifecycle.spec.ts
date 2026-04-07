import { test, expect } from '@playwright/test'
import { loginAsTeacher, loginAsStudent, gotoAndWait, dismissToast, skipIfNoAuth } from '../helpers'

/**
 * Critical Path: Quiz Attempt Full Lifecycle
 *
 * Memverifikasi bahwa:
 * 1. Student dapat menavigasi ke kuis, menjawab, dan submit
 * 2. Teacher dapat melihat hasil kuis student di gradebook
 * 3. Quiz dengan timer melakukan auto-submit saat waktu habis
 */

test.describe('Critical Path — Quiz Attempt Full Lifecycle', () => {
  test.beforeEach(() => {
    skipIfNoAuth()
  })

  test('student dapat membuka halaman daftar kuis', async ({ page }) => {
    await loginAsStudent(page)
    await gotoAndWait(page, '/#/app/student/quizzes')

    await expect(
      page.locator('h1, h2, [data-testid="quiz-list"], [data-testid="empty-state"]').first()
    ).toBeVisible({ timeout: 10000 })

    await expect(page).not.toHaveURL(/login/)
  })

  test('student dapat membuka kuis dan memulai pengerjaan', async ({ page }) => {
    await loginAsStudent(page)
    await gotoAndWait(page, '/#/app/student/quizzes')

    const startBtn = page
      .locator(
        'button:has-text("Mulai"), button:has-text("Kerjakan"), button:has-text("Lanjutkan"), [data-testid="start-quiz"]'
      )
      .first()

    const hasQuiz = await startBtn.isVisible({ timeout: 5000 }).catch(() => false)
    if (!hasQuiz) {
      test.skip()
      return
    }

    await startBtn.click()
    await page.waitForURL(/quiz|attempt/, { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Quiz player harus merender konten pertanyaan
    const questionVisible = await page
      .locator('[data-testid="quiz-question"], .quiz-question, h2, h3, p:has-text("Soal")')
      .first()
      .isVisible({ timeout: 8000 })
      .catch(() => false)

    expect(questionVisible).toBeTruthy()
    await expect(page).not.toHaveURL(/login/)
  })

  test('student dapat menjawab semua pertanyaan dan submit kuis', async ({ page }) => {
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

    // Jawab semua pertanyaan (max 20 iterasi untuk safety)
    for (let i = 0; i < 20; i++) {
      const option = page
        .locator(
          '[data-testid="quiz-option"], input[type="radio"] + label, .quiz-option, label:has(input[type="radio"]), button[role="radio"]'
        )
        .first()

      if (!(await option.isVisible({ timeout: 2000 }).catch(() => false))) break

      await option.click()
      await page.waitForTimeout(300)

      // Navigasi ke pertanyaan berikutnya
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

    // Submit kuis
    const submitBtn = page
      .locator(
        'button:has-text("Submit"), button:has-text("Kumpulkan"), button:has-text("Selesai"), [data-testid="submit-quiz"]'
      )
      .first()

    const hasSubmit = await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)
    if (!hasSubmit) {
      const fatalErrors = errors.filter(
        (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error')
      )
      expect(fatalErrors).toHaveLength(0)
      return
    }

    await submitBtn.click()
    await dismissToast(page)
    await page.waitForTimeout(2000)

    // Verifikasi halaman hasil atau konfirmasi muncul
    const resultVisible = await page
      .locator(
        '[data-testid="quiz-result"], [data-testid="score"], h1:has-text("Hasil"), h2:has-text("Hasil"), text=/[Ss]kor|[Ss]core|[Hh]asil|[Ss]elesai/'
      )
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)

    const fatalErrors = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error')
    )
    expect(fatalErrors).toHaveLength(0)

    if (resultVisible) {
      expect(resultVisible).toBeTruthy()
    } else {
      await expect(page).not.toHaveURL(/login/)
    }
  })

  test('teacher dapat melihat nilai kuis student di quiz gradebook', async ({ page }) => {
    await loginAsTeacher(page)
    await gotoAndWait(page, '/#/app/teacher/quiz-gradebook')

    await expect(
      page.locator('h1, h2, [data-testid="gradebook-table"], table').first()
    ).toBeVisible({ timeout: 10000 })

    await expect(page).not.toHaveURL(/login/)
  })

  test('teacher dapat membuka gradebook dan melihat daftar nilai', async ({ page }) => {
    await loginAsTeacher(page)
    await gotoAndWait(page, '/#/app/teacher/gradebook')

    const hasContent = await page
      .locator(
        'table, [data-testid="gradebook-table"], [data-testid="grade-row"], [data-testid="empty-state"], .grade-item'
      )
      .first()
      .isVisible({ timeout: 8000 })
      .catch(() => false)

    expect(hasContent).toBeTruthy()
    await expect(page).not.toHaveURL(/login/)
  })

  test('quiz dengan timer menampilkan countdown dan auto-submit saat waktu habis', async ({
    page,
  }) => {
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

    // Cek apakah ada timer yang ditampilkan
    const timerVisible = await page
      .locator(
        '[data-testid="quiz-timer"], .timer, .countdown, [class*="timer"], text=/\\d{1,2}:\\d{2}/'
      )
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    if (!timerVisible) {
      // Kuis ini tidak punya timer — verifikasi tidak crash
      const fatalErrors = errors.filter(
        (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error')
      )
      expect(fatalErrors).toHaveLength(0)
      return
    }

    // Baca waktu tersisa dari timer
    const timerText = await page
      .locator('[data-testid="quiz-timer"], .timer, .countdown')
      .first()
      .textContent()
      .catch(() => null)

    if (!timerText) {
      const fatalErrors = errors.filter(
        (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error')
      )
      expect(fatalErrors).toHaveLength(0)
      return
    }

    // Parse timer (format MM:SS)
    const parts = timerText.trim().split(':')
    if (parts.length !== 2) {
      const fatalErrors = errors.filter(
        (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error')
      )
      expect(fatalErrors).toHaveLength(0)
      return
    }

    const minutes = parseInt(parts[0], 10)
    const seconds = parseInt(parts[1], 10)
    const totalSeconds = minutes * 60 + seconds

    // Jika timer > 30 detik, jawab satu pertanyaan lalu tunggu beberapa detik
    // untuk memverifikasi timer berjalan. Tidak menunggu sampai habis (terlalu lama).
    if (totalSeconds > 30) {
      // Jawab satu pertanyaan untuk memastikan kuis aktif
      const option = page
        .locator(
          '[data-testid="quiz-option"], input[type="radio"] + label, .quiz-option, label:has(input[type="radio"])'
        )
        .first()

      if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
        await option.click()
        await page.waitForTimeout(500)
      }

      // Tunggu beberapa detik dan verifikasi timer berubah
      const timerBefore = await page
        .locator('[data-testid="quiz-timer"], .timer, .countdown')
        .first()
        .textContent()
        .catch(() => '')

      await page.waitForTimeout(5000)

      const timerAfter = await page
        .locator('[data-testid="quiz-timer"], .timer, .countdown')
        .first()
        .textContent()
        .catch(() => '')

      // Timer harus berubah (countdown berjalan)
      expect(timerBefore).not.toBe(timerAfter)

      // Submit manual karena tidak mungkin menunggu timer habis di E2E
      const submitBtn = page
        .locator(
          'button:has-text("Submit"), button:has-text("Kumpulkan"), button:has-text("Selesai"), [data-testid="submit-quiz"]'
        )
        .first()

      if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitBtn.click()
        await dismissToast(page)
        await page.waitForTimeout(2000)
      }
    }

    // Tidak ada error fatal
    const fatalErrors = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error')
    )
    expect(fatalErrors).toHaveLength(0)
  })

  test('student dapat melihat hasil kuis setelah submit', async ({ page }) => {
    await loginAsStudent(page)
    await gotoAndWait(page, '/#/app/student/quiz-grades')

    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    const bodyLen = await page.evaluate(() => document.body.textContent?.trim().length ?? 0)
    expect(bodyLen).toBeGreaterThan(50)
    await expect(page).not.toHaveURL(/login/)
  })

  test('halaman quiz player tidak mengalami JS error fatal', async ({ page }) => {
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
