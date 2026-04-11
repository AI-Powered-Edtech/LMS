import { test, expect, Page } from '@playwright/test'
import { loginAsTeacher, gotoAndWait } from '../helpers'

/**
 * COMPREHENSIVE FLOW ANALYSIS — Course Creation Module
 *
 * This test suite maps states and transitions for the Course Creation flow,
 * including happy paths, alternate paths, and exception handling.
 *
 * Logging system: Console logs prefixed with [E2E-LOG]
 */

const LOG_PREFIX = '[E2E-LOG]'

function log(message: string) {
  console.log(`${LOG_PREFIX} ${new Date().toISOString()} - ${message}`)
}

test.describe('Teacher — Comprehensive Course Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    log('Starting test session: Teacher Login')
    await loginAsTeacher(page)
  })

  test('Happy Path: Create -> Build -> Publish', async ({ page }) => {
    log('PATH: Happy Path (Full Lifecycle)')

    // STATE: List
    log('STATE: List - Navigating to teaching courses')
    await page.goto('/#/teaching/courses')
    await expect(page.locator('h1, h2')).toContainText(/Kursus|Teaching/i)

    // TRANSITION: Click "Buat Kursus"
    log('TRANSITION: Clicking "Buat Kursus"')
    const createBtn = page.locator('button:has-text("Buat Kursus"), [data-testid="create-course"]')
    await createBtn.click()

    // STATE: Creating (Initial Form)
    log('STATE: Creating - Filling initial form')
    const title = `Course E2E ${Date.now()}`
    await page.fill('input[placeholder*="Judul"], [name="title"]', title)
    await page.fill(
      'textarea[placeholder*="Deskripsi"], [name="description"]',
      'Comprehensive E2E Test Course'
    )

    // TRANSITION: Submit Form
    log('TRANSITION: Submitting initial form')
    await page.click('button[type="submit"], button:has-text("Simpan")')

    // STATE: Building (Course Builder)
    log('STATE: Building - Adding module and lesson')
    await page.waitForURL(/builder|edit/, { timeout: 15000 })

    // Add Module
    const addModuleBtn = page.locator('button:has-text("Tambah Modul"), [data-testid="add-module"]')
    await addModuleBtn.waitFor({ state: 'visible' })
    await addModuleBtn.click()
    await page.fill('input[placeholder*="Nama Modul"]', 'Modul Dasar')
    await page.click('button:has-text("Simpan"), button:has-text("OK")')

    // Add Lesson
    log('STATE: Building - Adding lesson to module')
    const addLessonBtn = page
      .locator('button:has-text("Tambah Materi"), [data-testid="add-lesson"]')
      .first()
    await addLessonBtn.click()
    await page.fill('input[placeholder*="Judul Materi"]', 'Materi 1: Pengenalan')
    await page.click('button:has-text("Simpan")')

    // TRANSITION: Publish
    log('TRANSITION: Publishing course')
    const publishBtn = page.locator('button:has-text("Publish"), [data-testid="publish-course"]')
    await publishBtn.click()

    // Confirm Publish
    const confirmBtn = page.locator(
      'button:has-text("Ya, Publish"), .modal-footer button:has-text("Publish")'
    )
    if (await confirmBtn.isVisible({ timeout: 3000 })) {
      await confirmBtn.click()
    }

    // STATE: Published
    log('STATE: Published - Verifying status')
    await expect(page.locator('text=/Terbit|Published/i')).toBeVisible({ timeout: 10000 })

    // VERIFIKASI DATABASE: Pastikan course benar-benar diterbitkan di database
    const db = page.evaluate(() => {
      return window.db
    }) as any

    if (db) {
      // Dapatkan data teacher untuk mendapatkan user ID
      const {
        data: { session },
      } = await db.auth.getSession()
      const teacherId = session?.user?.id

      // Query course yang baru dibuat (dengan timestamp terbaru)
      const { data: courses, error } = await db
        .from('courses')
        .select('id, title, course_status, created_by')
        .eq('created_by', teacherId)
        .order('created_at', { ascending: false })
        .limit(1)

      expect(error).toBeNull()
      expect(courses).toBeArray()
      expect(courses.length).toBeGreaterThan(0)

      const latestCourse = courses[0]
      expect(latestCourse).toHaveProperty('id')
      expect(latestCourse).toHaveProperty('title', title)
      expect(latestCourse).toHaveProperty('course_status', 'published')
      expect(latestCourse).toHaveProperty('created_by', teacherId)
      expect(latestCourse).toHaveProperty('created_at')
    }

    log('SUCCESS: Happy Path completed')
  })

  test('Alternate Path: Draft Saving & Resume', async ({ page }) => {
    log('PATH: Alternate Path (Draft & Resume)')

    await page.goto('/#/teaching/courses')
    await page.click('button:has-text("Buat Kursus")')

    const title = `Draft E2E ${Date.now()}`
    await page.fill('[name="title"]', title)
    await page.click('button:has-text("Simpan")')

    await page.waitForURL(/builder|edit/)
    log('STATE: Building - Saving as draft and exiting')

    // Simulate exit by going back to list
    await page.goto('/#/teaching/courses')

    // STATE: List - Finding the draft
    log('STATE: List - Finding and resuming draft')
    const draftItem = page.locator(`text=${title}`)
    await expect(draftItem).toBeVisible()

    // TRANSITION: Edit draft
    await page
      .locator(
        `tr:has-text("${title}") button:has-text("Edit"), .card:has-text("${title}") button:has-text("Edit")`
      )
      .first()
      .click()

    // STATE: Building - Resumed
    log('STATE: Building - Verifying resume successful')
    await expect(page).toHaveURL(/builder|edit/)
    log('SUCCESS: Alternate Path completed')
  })

  test('Exception Path: Form Validation & Error Recovery', async ({ page }) => {
    log('PATH: Exception Path (Validation Errors)')

    await page.goto('/#/teaching/courses')
    await page.click('button:has-text("Buat Kursus")')

    // Attempt to submit empty form
    log('TRANSITION: Submitting empty form to trigger validation')
    await page.click('button[type="submit"]')

    // STATE: Error - Verifying validation messages
    log('STATE: Error - Checking validation messages')
    const errorMsg = page.locator('text=/wajib diisi|required|tidak boleh kosong/i').first()
    await expect(errorMsg).toBeVisible()

    // RECOVERY: Fill required data
    log('RECOVERY: Filling missing data to recover')
    await page.fill('[name="title"]', 'Recovery Test')
    await page.click('button[type="submit"]')

    // STATE: Success Transition
    await expect(page).toHaveURL(/builder|edit/)
    log('SUCCESS: Exception Path recovered successfully')
  })

  test('Wait Strategies & Interaction Stability', async ({ page }) => {
    log('PATH: Wait Strategy Test')

    // Simulate slow network or slow transitions
    await page.goto('/#/teaching/courses')

    // Instead of hard wait, wait for specific element state
    const loadingIndicator = page.locator('.spinner, .loading, [role="status"]')
    if (await loadingIndicator.isVisible()) {
      log('INFO: Waiting for loader to disappear')
      await expect(loadingIndicator).not.toBeVisible({ timeout: 15000 })
    }

    log('INFO: Using stable interaction (click with retry)')
    const btn = page.locator('button:has-text("Buat Kursus")')
    await btn.waitFor({ state: 'visible' })
    await btn.click()

    await expect(page.locator('input[name="title"]')).toBeFocused()
    log('SUCCESS: Wait strategies verified')
  })
})
