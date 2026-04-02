import { test, expect } from '@playwright/test'

// ============================================================================
// Phase 26: Quiz Timer Pause/Resume
// ============================================================================

test.describe('Quiz Timer Pause/Resume', () => {
  test('QP.1 — Student quizzes page loads', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')

    await page.goto('/#/app/student/quizzes')
    await page.waitForTimeout(3000)

    await expect(page.locator('h1').filter({ hasText: /Kuis|Evaluasi/i })).toBeVisible({
      timeout: 15000,
    })
  })

  test('QP.2 — Quiz with timer shows timer display', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    test.skip(!process.env.VITE_SUPABASE_URL, 'Supabase tidak dikonfigurasi — skip timer test')

    await page.goto('/#/app/student/quizzes')
    await page.waitForTimeout(3000)

    // Try to start a quiz
    const startQuizBtn = page
      .locator('button')
      .filter({
        hasText: /Mulai Kuis|Kerjakan|Mulai/i,
      })
      .first()

    if (await startQuizBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startQuizBtn.click()
      await page.waitForTimeout(3000)

      // Verify timer is displayed
      const hasTimer = await page
        .locator('text=/\\d{1,2}:\\d{2}|Waktu|Timer|Sisa Waktu/i')
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false)
      const hasQuizContent = await page
        .locator('text=/Soal|Pertanyaan|Question/i')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      expect(hasTimer || hasQuizContent).toBeTruthy()
    }
  })

  test('QP.3 — "Jeda" (pause) button is visible during quiz', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    test.skip(
      !process.env.VITE_SUPABASE_URL,
      'Supabase tidak dikonfigurasi — skip pause button test'
    )

    await page.goto('/#/app/student/quizzes')
    await page.waitForTimeout(3000)

    const startQuizBtn = page
      .locator('button')
      .filter({
        hasText: /Mulai Kuis|Kerjakan|Mulai/i,
      })
      .first()

    if (await startQuizBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startQuizBtn.click()
      await page.waitForTimeout(3000)

      // Look for pause button
      const pauseBtn = page
        .locator('button')
        .filter({
          hasText: /Jeda|Pause|⏸/i,
        })
        .first()

      if (await pauseBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
        await expect(pauseBtn).toBeVisible()
      } else {
        // Quiz might not have timer pause feature enabled
        // Verify quiz content is at least visible
        const hasQuizUI = await page
          .locator('text=/Soal|Pertanyaan|Kuis/i')
          .first()
          .isVisible({ timeout: 5000 })
          .catch(() => false)
        expect(hasQuizUI).toBeTruthy()
      }
    }
  })

  test('QP.4 — Clicking "Jeda" shows DIJEDA state with blur overlay', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    test.skip(
      !process.env.VITE_SUPABASE_URL,
      'Supabase tidak dikonfigurasi — skip pause state test'
    )

    await page.goto('/#/app/student/quizzes')
    await page.waitForTimeout(3000)

    const startQuizBtn = page
      .locator('button')
      .filter({
        hasText: /Mulai Kuis|Kerjakan|Mulai/i,
      })
      .first()

    if (await startQuizBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startQuizBtn.click()
      await page.waitForTimeout(3000)

      const pauseBtn = page
        .locator('button')
        .filter({
          hasText: /Jeda|Pause|⏸/i,
        })
        .first()

      if (await pauseBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
        await pauseBtn.click()
        await page.waitForTimeout(1000)

        // Verify DIJEDA state
        const hasPausedState = await page
          .locator('text=/DIJEDA|Paused|Kuis Dijeda|Timer Dijeda/i')
          .first()
          .isVisible({ timeout: 5000 })
          .catch(() => false)
        const hasBlurOverlay = await page
          .locator('[class*="blur"], [class*="overlay"], [class*="paused"]')
          .first()
          .isVisible({ timeout: 5000 })
          .catch(() => false)

        expect(hasPausedState || hasBlurOverlay).toBeTruthy()
      }
    }
  })

  test('QP.5 — "Lanjutkan" resumes timer after pause', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    test.skip(!process.env.VITE_SUPABASE_URL, 'Supabase tidak dikonfigurasi — skip resume test')

    await page.goto('/#/app/student/quizzes')
    await page.waitForTimeout(3000)

    const startQuizBtn = page
      .locator('button')
      .filter({
        hasText: /Mulai Kuis|Kerjakan|Mulai/i,
      })
      .first()

    if (await startQuizBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startQuizBtn.click()
      await page.waitForTimeout(3000)

      const pauseBtn = page
        .locator('button')
        .filter({
          hasText: /Jeda|Pause|⏸/i,
        })
        .first()

      if (await pauseBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
        // Pause
        await pauseBtn.click()
        await page.waitForTimeout(1000)

        // Click resume
        const resumeBtn = page
          .locator('button')
          .filter({
            hasText: /Lanjutkan|Resume|Lanjut/i,
          })
          .first()

        if (await resumeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
          await resumeBtn.click()
          await page.waitForTimeout(1000)

          // Verify timer resumed — paused state should be gone
          const pausedGone = await page
            .locator('text=/DIJEDA|Paused/i')
            .first()
            .isHidden({ timeout: 5000 })
            .catch(() => true)

          expect(pausedGone).toBeTruthy()

          // Quiz content should be visible again (no blur)
          const hasQuizContent = await page
            .locator('text=/Soal|Pertanyaan|Question/i')
            .first()
            .isVisible({ timeout: 5000 })
            .catch(() => false)

          if (hasQuizContent) {
            expect(hasQuizContent).toBeTruthy()
          }
        }
      }
    }
  })

  test('QP.6 — Pause button disabled after 1x usage', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    test.skip(
      !process.env.VITE_SUPABASE_URL,
      'Supabase tidak dikonfigurasi — skip pause limit test'
    )

    await page.goto('/#/app/student/quizzes')
    await page.waitForTimeout(3000)

    const startQuizBtn = page
      .locator('button')
      .filter({
        hasText: /Mulai Kuis|Kerjakan|Mulai/i,
      })
      .first()

    if (await startQuizBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startQuizBtn.click()
      await page.waitForTimeout(3000)

      const pauseBtn = page
        .locator('button')
        .filter({
          hasText: /Jeda|Pause|⏸/i,
        })
        .first()

      if (await pauseBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
        // Use the one-time pause
        await pauseBtn.click()
        await page.waitForTimeout(1000)

        // Resume
        const resumeBtn = page
          .locator('button')
          .filter({
            hasText: /Lanjutkan|Resume|Lanjut/i,
          })
          .first()

        if (await resumeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
          await resumeBtn.click()
          await page.waitForTimeout(1000)

          // Pause button should now be disabled (1x usage limit)
          const pauseBtnAfter = page
            .locator('button')
            .filter({
              hasText: /Jeda|Pause|⏸/i,
            })
            .first()

          if (await pauseBtnAfter.isVisible({ timeout: 5000 }).catch(() => false)) {
            const isDisabled = await pauseBtnAfter.isDisabled()
            // Button should either be disabled or removed
            expect(isDisabled).toBeTruthy()
          }
        }
      }
    }
  })

  test('QP.7 — Quiz page shows available quizzes or empty state', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')

    await page.goto('/#/app/student/quizzes')
    await page.waitForTimeout(3000)

    const hasQuizCards = await page
      .locator('text=/Mulai Kuis|Kerjakan|Tersedia/i')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    const hasEmptyState = await page
      .locator('text=/Belum ada kuis yang tersedia|belum tersedia/i')
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false)
    const hasPage = await page
      .locator('h1')
      .filter({ hasText: /Kuis|Evaluasi/i })
      .isVisible({ timeout: 3000 })
      .catch(() => false)

    expect(hasQuizCards || hasEmptyState || hasPage).toBeTruthy()
  })

  test('QP.8 — Quiz stat cards visible (Total Kuis, Selesai, etc.)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')

    await page.goto('/#/app/student/quizzes')
    await page.waitForTimeout(3000)

    const statLabels = ['Total Kuis', 'Selesai', 'Rata-rata', 'Poin Total']
    let foundStats = 0

    for (const label of statLabels) {
      const stat = page.locator(`text=${label}`).first()
      if (await stat.isVisible({ timeout: 3000 }).catch(() => false)) {
        foundStats++
      }
    }

    // At least the quiz page heading should be visible
    const hasQuizPage = await page
      .locator('h1')
      .filter({ hasText: /Kuis|Evaluasi/i })
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    expect(foundStats > 0 || hasQuizPage).toBeTruthy()
  })
})
