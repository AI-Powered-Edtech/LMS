import { test, expect, Page } from '@playwright/test'
import { loginAsStudent, gotoAndWait, clickWithRetry, waitForContent } from '../helpers'

/**
 * COMPREHENSIVE FLOW ANALYSIS — Quiz Attempt Module
 *
 * Maps states and transitions for the Student Quiz flow.
 */

const LOG_PREFIX = '[QUIZ-E2E-LOG]'

function log(message: string) {
  console.log(`${LOG_PREFIX} ${new Date().toISOString()} - ${message}`)
}

test.describe('Student — Comprehensive Quiz Attempt Flow', () => {
  test.beforeEach(async ({ page }) => {
    log('Starting Quiz test session')
    await loginAsStudent(page)
  })

  test('Happy Path: Complete Lifecycle', async ({ page }) => {
    log('PATH: Happy Path (Start to Finish)')

    // STATE: List
    await gotoAndWait(page, '/#/app/student/quizzes')
    log('STATE: List - Finding a quiz to start')

    const startBtn = page.locator('button:has-text("Mulai"), [data-testid="start-quiz"]').first()
    const hasQuiz = await startBtn.isVisible({ timeout: 5000 }).catch(() => false)

    if (!hasQuiz) {
      log('SKIP: No quizzes available for testing')
      test.skip()
      return
    }

    // TRANSITION: Start Quiz
    log('TRANSITION: Clicking Start')
    await startBtn.click()

    // STATE: Active
    log('STATE: Active - Answering questions')
    await page.waitForURL(/quiz|attempt/, { timeout: 10000 })

    // Check for question content
    await waitForContent(page, '[data-testid="quiz-question"], .quiz-question')

    // Answer questions (simple loop for 2 questions)
    for (let i = 0; i < 2; i++) {
      const option = page.locator('[data-testid="quiz-option"], .quiz-option').first()
      if (await option.isVisible({ timeout: 3000 })) {
        await option.click()
        log(`ACTION: Answered question ${i + 1}`)

        const nextBtn = page.locator(
          'button:has-text("Selanjutnya"), [data-testid="next-question"]'
        )
        if (await nextBtn.isVisible()) {
          await nextBtn.click()
          await page.waitForTimeout(500)
        }
      }
    }

    // TRANSITION: Submit
    log('TRANSITION: Submitting quiz')
    const submitBtn = page.locator('button:has-text("Kumpulkan"), [data-testid="submit-quiz"]')
    await submitBtn.click()

    // Confirm Submit Modal
    const confirmBtn = page.locator(
      'button:has-text("Ya, Kumpulkan"), .modal-footer button:has-text("Kumpulkan")'
    )
    if (await confirmBtn.isVisible({ timeout: 3000 })) {
      await confirmBtn.click()
    }

    // STATE: Review
    log('STATE: Review - Verifying results')
    await expect(page.locator('text=/Selesai|Skor|Result/i')).toBeVisible({ timeout: 15000 })
    log('SUCCESS: Quiz attempt completed')
  })

  test('Exception Path: Offline Handling & Retry', async ({ page, context }) => {
    log('PATH: Exception Path (Offline Simulation)')

    await gotoAndWait(page, '/#/app/student/quizzes')
    const startBtn = page.locator('button:has-text("Mulai"), [data-testid="start-quiz"]').first()
    if (!(await startBtn.isVisible())) {
      test.skip()
      return
    }
    await startBtn.click()
    await page.waitForURL(/quiz|attempt/)

    // GO OFFLINE
    log('ACTION: Simulating Offline Mode')
    await context.setOffline(true)

    // Try to answer
    const option = page.locator('[data-testid="quiz-option"], .quiz-option').first()
    if (await option.isVisible()) {
      await option.click()
      log('STATE: Error - Expecting offline indicator')

      // Wait for offline toast or indicator
      const offlineMsg = page.locator('text=/Offline|Internet Terputus|Tidak ada koneksi/i').first()
      await expect(offlineMsg).toBeVisible({ timeout: 10000 })
    }

    // RECOVERY: Go Online
    log('ACTION: Restoring Online Mode')
    await context.setOffline(false)

    // Wait for auto-retry or manual trigger
    const onlineMsg = page.locator('text=/Kembali Online|Tersambung/i').first()
    await expect(onlineMsg).toBeVisible({ timeout: 10000 })

    log('SUCCESS: Offline recovery verified')
  })

  test('Wait Strategies: UI Stability during Autosave', async ({ page }) => {
    log('PATH: Stability Test (Autosave Indicator)')

    await gotoAndWait(page, '/#/app/student/quizzes')
    const startBtn = page.locator('button:has-text("Mulai"), [data-testid="start-quiz"]').first()
    if (!(await startBtn.isVisible())) {
      test.skip()
      return
    }
    await startBtn.click()

    log('STATE: Active - Checking for autosave feedback')
    const saveIndicator = page.locator('[data-testid="save-status"], .save-status')

    // Trigger a change to force autosave if it's reactive
    const option = page.locator('[data-testid="quiz-option"]').first()
    if (await option.isVisible()) {
      await option.click()

      // Verification: Indicator should not show error
      const errorIndicator = page.locator('text=/Gagal Menyimpan|Error saving/i')
      await expect(errorIndicator).not.toBeVisible({ timeout: 5000 })
    }

    log('SUCCESS: Interaction stability verified')
  })
})
