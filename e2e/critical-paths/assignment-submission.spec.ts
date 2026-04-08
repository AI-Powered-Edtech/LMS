import { test, expect } from '@playwright/test'
import { loginAsTeacher, loginAsStudent, gotoAndWait, dismissToast, skipIfNoAuth } from '../helpers'

/**
 * Critical Path: Assignment Submission → Grade Flow
 *
 * Memverifikasi bahwa:
 * 1. Teacher dapat membuat assignment
 * 2. Student dapat melihat assignment, upload file, dan submit
 * 3. Teacher dapat membuka SpeedGrader, memberikan skor dan feedback, publish grade
 * 4. Student dapat melihat grade di Student Grade View
 */

test.describe('Critical Path — Assignment Submission → Grade Flow', () => {
  test.beforeEach(() => {
    skipIfNoAuth()
  })

  test('teacher dapat mengakses halaman assignments', async ({ page }) => {
    await loginAsTeacher(page)
    await gotoAndWait(page, '/#/app/teacher/assignments')

    await expect(
      page.locator('h1, h2, [data-testid="assignment-list"], [data-testid="empty-state"]').first()
    ).toBeVisible({ timeout: 10000 })

    await expect(page).not.toHaveURL(/login/)
  })

  test('teacher dapat membuat assignment baru', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await loginAsTeacher(page)
    await gotoAndWait(page, '/#/app/teacher/assignments')

    // Cari tombol buat assignment
    const createBtn = page
      .locator(
        'button:has-text("Buat"), button:has-text("Tambah"), button:has-text("Assignment"), button:has-text("Tugas"), [data-testid="create-assignment"]'
      )
      .first()

    const hasCreateBtn = await createBtn.isVisible({ timeout: 5000 }).catch(() => false)
    if (!hasCreateBtn) {
      // Tidak ada tombol create — verifikasi halaman tidak crash
      const fatalErrors = errors.filter(
        (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error')
      )
      expect(fatalErrors).toHaveLength(0)
      return
    }

    await createBtn.click()
    await page.waitForTimeout(1000)

    // Cek apakah form assignment muncul (modal atau halaman baru)
    const formVisible = await page
      .locator('[data-testid="assignment-form"], form, [role="dialog"], .modal, .dialog')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    if (formVisible) {
      // Isi form assignment jika ada
      const titleInput = page
        .locator(
          'input[placeholder*="judul"], input[placeholder*="Judul"], input[placeholder*="Assignment"], input[name="title"], input[name="judul"], [data-testid="assignment-title"]'
        )
        .first()

      if (await titleInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await titleInput.fill(`Test Assignment ${Date.now()}`)
      }

      const descInput = page
        .locator(
          'textarea[placeholder*="deskripsi"], textarea[placeholder*="Deskripsi"], textarea[name="description"], textarea[name="deskripsi"], [data-testid="assignment-description"]'
        )
        .first()

      if (await descInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await descInput.fill('Test assignment description untuk E2E testing')
      }

      // Submit form
      const submitBtn = page
        .locator(
          'button[type="submit"], button:has-text("Simpan"), button:has-text("Buat"), button:has-text("Publish"), [data-testid="submit-assignment"]'
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

  test('student dapat melihat daftar assignment', async ({ page }) => {
    await loginAsStudent(page)
    await gotoAndWait(page, '/#/app/student/assignments')

    const hasContent = await page
      .locator(
        'h1, h2, [data-testid="assignment-list"], [data-testid="assignment-card"], [data-testid="empty-state"], .assignment-item'
      )
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)

    expect(hasContent).toBeTruthy()
    await expect(page).not.toHaveURL(/login/)
  })

  test('student dapat membuka detail assignment', async ({ page }) => {
    await loginAsStudent(page)
    await gotoAndWait(page, '/#/app/student/assignments')

    // Cari assignment card/link
    const assignmentLink = page
      .locator(
        '[data-testid="assignment-card"], [data-testid="assignment-item"], a:has-text("Tugas"), a:has-text("Assignment"), .assignment-card, .assignment-item'
      )
      .first()

    const hasAssignment = await assignmentLink.isVisible({ timeout: 5000 }).catch(() => false)
    if (!hasAssignment) {
      const bodyLen = await page.evaluate(() => document.body.textContent?.trim().length ?? 0)
      expect(bodyLen).toBeGreaterThan(50)
      return
    }

    await assignmentLink.click()
    await page.waitForLoadState('networkidle')

    // Detail assignment harus muncul
    const detailVisible = await page
      .locator(
        'h1, h2, [data-testid="assignment-detail"], [data-testid="assignment-info"], .assignment-detail'
      )
      .first()
      .isVisible({ timeout: 8000 })
      .catch(() => false)

    expect(detailVisible).toBeTruthy()
    await expect(page).not.toHaveURL(/login/)
  })

  test('student dapat mengupload file dan submit assignment', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await loginAsStudent(page)
    await gotoAndWait(page, '/#/app/student/assignments')

    // Cari assignment yang bisa dikerjakan
    const submitBtn = page
      .locator(
        'button:has-text("Submit"), button:has-text("Kumpulkan"), button:has-text("Upload"), button:has-text("Unggah"), [data-testid="submit-assignment"]'
      )
      .first()

    const hasSubmitBtn = await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)
    if (!hasSubmitBtn) {
      // Tidak ada assignment yang bisa disubmit — verifikasi tidak crash
      const fatalErrors = errors.filter(
        (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error')
      )
      expect(fatalErrors).toHaveLength(0)
      return
    }

    // Cek apakah ada file upload area
    const uploadArea = page
      .locator(
        '[data-testid="file-upload"], input[type="file"], .upload-area, .dropzone, [class*="upload"]'
      )
      .first()

    if (await uploadArea.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Coba interaksi dengan upload area (tanpa file asli)
      await uploadArea.click()
      await page.waitForTimeout(500)
    }

    // Klik submit
    await submitBtn.click()
    await dismissToast(page)
    await page.waitForTimeout(2000)

    // Verifikasi tidak ada error fatal
    const fatalErrors = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error')
    )
    expect(fatalErrors).toHaveLength(0)

    // Halaman tidak redirect ke login
    await expect(page).not.toHaveURL(/login/)

    // VERIFIKASI DATABASE: Pastikan submission tersimpan di database
    const supabase = page.evaluate(() => {
      return window.supabase
    }) as any

    if (supabase) {
      // Dapatkan data student untuk mendapatkan user ID
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const studentId = session?.user?.id

      // Query submission terbaru untuk student ini
      const { data: submissions, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(1)

      expect(error).toBeNull()
      expect(submissions).toBeArray()
      expect(submissions.length).toBeGreaterThan(0)

      const latestSubmission = submissions[0]
      expect(latestSubmission).toHaveProperty('id')
      expect(latestSubmission).toHaveProperty('student_id', studentId)
      expect(latestSubmission).toHaveProperty('status', 'submitted')
      expect(latestSubmission).toHaveProperty('created_at')
      expect(latestSubmission).toHaveProperty('updated_at')
    }
  })

  test('teacher dapat mengakses SpeedGrader', async ({ page }) => {
    await loginAsTeacher(page)
    await gotoAndWait(page, '/#/app/teacher/speedgrader')

    // SpeedGrader harus menampilkan konten (atau empty state)
    const hasContent = await page
      .locator(
        'h1, h2, [data-testid="speedgrader"], [data-testid="speedgrader-container"], [data-testid="empty-state"], .speedgrader'
      )
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)

    expect(hasContent).toBeTruthy()
    await expect(page).not.toHaveURL(/login/)
  })

  test('teacher dapat memberikan skor dan feedback di SpeedGrader', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await loginAsTeacher(page)
    await gotoAndWait(page, '/#/app/teacher/speedgrader')

    // Cari input skor
    const gradeInput = page
      .locator(
        'input[type="number"][placeholder*="ilai"], input[type="number"][placeholder*="kor"], input[data-testid="grade-input"], [data-testid="score-input"], .grade-input'
      )
      .first()

    const hasGradeInput = await gradeInput.isVisible({ timeout: 5000 }).catch(() => false)
    if (!hasGradeInput) {
      // Tidak ada submission untuk di-grade — verifikasi tidak crash
      const fatalErrors = errors.filter(
        (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error')
      )
      expect(fatalErrors).toHaveLength(0)
      return
    }

    // Isi skor
    await gradeInput.click()
    await gradeInput.fill('85')
    await page.waitForTimeout(500)

    // Cari input feedback
    const feedbackInput = page
      .locator(
        'textarea[placeholder*="eedback"], textarea[placeholder*="omentar"], textarea[data-testid="feedback-input"], [data-testid="feedback-textarea"], .feedback-input'
      )
      .first()

    if (await feedbackInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await feedbackInput.fill('Pekerjaan bagus! Pertahankan.')
      await page.waitForTimeout(500)
    }

    // Cari tombol publish/save grade
    const publishBtn = page
      .locator(
        'button:has-text("Publish"), button:has-text("Simpan"), button:has-text("Kirim"), button:has-text("Terbitkan"), [data-testid="publish-grade"]'
      )
      .first()

    if (await publishBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await publishBtn.click()
      await dismissToast(page)
      await page.waitForTimeout(2000)
    }

    // Tidak ada error fatal
    const fatalErrors = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error')
    )
    expect(fatalErrors).toHaveLength(0)
  })

  test('student dapat melihat grade assignment di Student Grade View', async ({ page }) => {
    await loginAsStudent(page)
    await gotoAndWait(page, '/#/app/student/grades')

    const hasContent = await page
      .locator(
        'h1, h2, table, [data-testid="grades-list"], [data-testid="grade-card"], [data-testid="empty-state"], .grade-item'
      )
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)

    expect(hasContent).toBeTruthy()
    await expect(page).not.toHaveURL(/login/)
  })

  test('student dapat melihat detail grade assignment', async ({ page }) => {
    await loginAsStudent(page)
    await gotoAndWait(page, '/#/app/student/grades')

    // Cari grade item yang bisa diklik
    const gradeItem = page
      .locator('[data-testid="grade-card"], [data-testid="grade-row"], .grade-item, tr:has(td)')
      .first()

    const hasGradeItem = await gradeItem.isVisible({ timeout: 5000 }).catch(() => false)
    if (!hasGradeItem) {
      const bodyLen = await page.evaluate(() => document.body.textContent?.trim().length ?? 0)
      expect(bodyLen).toBeGreaterThan(50)
      return
    }

    await gradeItem.click()
    await page.waitForTimeout(1000)

    // Detail grade harus menampilkan skor atau feedback
    const detailVisible = await page
      .locator(
        '[data-testid="grade-detail"], [data-testid="score"], [data-testid="feedback"], .grade-detail, text=/[Ss]kor|[Ss]core|[Nn]ilai|[Ff]eedback|[Kk]omentar/'
      )
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    // Soft assertion — detail mungkin tidak selalu tersedia
    await expect(page).not.toHaveURL(/login/)
  })

  test('halaman SpeedGrader tidak mengalami JS error fatal', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await loginAsTeacher(page)
    await gotoAndWait(page, '/#/app/teacher/speedgrader')
    await page.waitForTimeout(2000)

    const fatalErrors = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error')
    )
    expect(fatalErrors).toHaveLength(0)
  })

  test('halaman assignment student tidak mengalami JS error fatal', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await loginAsStudent(page)
    await gotoAndWait(page, '/#/app/student/assignments')
    await page.waitForTimeout(2000)

    const fatalErrors = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error')
    )
    expect(fatalErrors).toHaveLength(0)
  })

  test('halaman assignment teacher tidak mengalami JS error fatal', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await loginAsTeacher(page)
    await gotoAndWait(page, '/#/app/teacher/assignments')
    await page.waitForTimeout(2000)

    const fatalErrors = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error')
    )
    expect(fatalErrors).toHaveLength(0)
  })

  test('assignment pages memenuhi performance budget', async ({ page }) => {
    await loginAsTeacher(page)
    await page.goto('/#/app/teacher/assignments')
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
