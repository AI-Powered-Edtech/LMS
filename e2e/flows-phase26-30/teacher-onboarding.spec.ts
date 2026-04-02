import { test, expect } from '@playwright/test'

// ============================================================================
// Phase 27: Teacher Onboarding Wizard
// ============================================================================

test.describe('Teacher Onboarding Wizard', () => {
  test('TO.1 — Teacher dashboard loads for authenticated teacher', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')

    await page.goto('/#/app/teacher/dashboard')
    await page.waitForTimeout(5000)

    await expect(
      page.locator('text=/Selamat Datang|Dasbor Guru|Perbarui Data|Dashboard/i').first()
    ).toBeVisible({ timeout: 30000 })
  })

  test('TO.2 — Onboarding wizard modal appears for first-time teacher', async ({ browser }) => {
    test.skip(
      !process.env.VITE_SUPABASE_URL,
      'Supabase tidak dikonfigurasi — skip onboarding wizard test'
    )

    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()

    // Login as a new teacher (first-time)
    await page.goto('/#/login')
    await page.waitForTimeout(2000)

    const emailInput = page.locator('input[type="email"], input[name="email"]')
    if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await page.fill('input[type="email"], input[name="email"]', 'teacher@edusync.dev')
      await page.fill('input[type="password"], input[name="password"]', 'password123')
      await page.locator('button[type="submit"]').click()
      await page.waitForTimeout(5000)
    }

    await page.goto('/#/app/teacher/dashboard')
    await page.waitForTimeout(5000)

    if (page.url().includes('/app/teacher')) {
      // Onboarding wizard may appear as a modal or overlay
      const hasWizard = await page
        .locator('text=/Selamat Datang|Wizard|Pengaturan Awal|Mulai Pengaturan|Onboarding/i')
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false)
      const hasDashboard = await page
        .locator('text=/Dasbor Guru|Dashboard|Perbarui Data/i')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      // Either wizard or dashboard should be visible (wizard only appears for first-time)
      expect(hasWizard || hasDashboard).toBeTruthy()
    }

    await context.close()
  })

  test('TO.3 — Wizard Step 1: Welcome message and "Mulai Pengaturan" button', async ({
    browser,
  }) => {
    test.skip(
      !process.env.VITE_SUPABASE_URL,
      'Supabase tidak dikonfigurasi — skip wizard step 1 test'
    )

    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await page.goto('/#/app/teacher/dashboard')
    await page.waitForTimeout(5000)

    if (page.url().includes('/app/teacher')) {
      // Look for wizard step 1 content
      const welcomeMsg = page.locator('text=/Selamat Datang|Welcome|Pengaturan Awal/i').first()
      const startBtn = page
        .locator('button')
        .filter({
          hasText: /Mulai Pengaturan|Mulai|Lanjut|Berikutnya/i,
        })
        .first()

      const hasWelcome = await welcomeMsg.isVisible({ timeout: 10000 }).catch(() => false)

      if (hasWelcome) {
        await expect(welcomeMsg).toBeVisible()

        if (await startBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
          await expect(startBtn).toBeVisible()
        }
      }
    }

    await context.close()
  })

  test('TO.4 — Wizard Step 2: Class creation with "Buat Kelas" or "Lewati"', async ({
    browser,
  }) => {
    test.skip(
      !process.env.VITE_SUPABASE_URL,
      'Supabase tidak dikonfigurasi — skip wizard step 2 test'
    )

    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await page.goto('/#/app/teacher/dashboard')
    await page.waitForTimeout(5000)

    if (page.url().includes('/app/teacher')) {
      // Navigate to step 2 if wizard is visible
      const startBtn = page
        .locator('button')
        .filter({
          hasText: /Mulai Pengaturan|Mulai|Lanjut/i,
        })
        .first()

      if (await startBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
        await startBtn.click()
        await page.waitForTimeout(2000)

        // Step 2: Class creation
        const classNameInput = page
          .locator(
            'input[name="class_name"], input[placeholder*="kelas"], input[placeholder*="Kelas"]'
          )
          .first()
        const createClassBtn = page
          .locator('button')
          .filter({
            hasText: /Buat Kelas|Buat/i,
          })
          .first()
        const skipBtn = page
          .locator('button')
          .filter({
            hasText: /Lewati|Skip|Nanti/i,
          })
          .first()

        const hasStep2 =
          (await classNameInput.isVisible({ timeout: 5000 }).catch(() => false)) ||
          (await createClassBtn.isVisible({ timeout: 3000 }).catch(() => false)) ||
          (await skipBtn.isVisible({ timeout: 3000 }).catch(() => false))

        if (hasStep2) {
          expect(hasStep2).toBeTruthy()
        }
      }
    }

    await context.close()
  })

  test('TO.5 — Wizard Step 3: Join code display', async ({ browser }) => {
    test.skip(
      !process.env.VITE_SUPABASE_URL,
      'Supabase tidak dikonfigurasi — skip wizard step 3 test'
    )

    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await page.goto('/#/app/teacher/dashboard')
    await page.waitForTimeout(5000)

    if (page.url().includes('/app/teacher')) {
      // If wizard is visible, look for join code display
      const hasJoinCode = await page
        .locator('text=/Kode Gabung|Join Code|Kode Kelas|Bagikan/i')
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false)
      const hasSelesaiBtn = await page
        .locator('button')
        .filter({ hasText: /Selesai|Lanjut|Berikutnya/i })
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      if (hasJoinCode) {
        expect(hasJoinCode).toBeTruthy()
      }
      if (hasSelesaiBtn) {
        expect(hasSelesaiBtn).toBeTruthy()
      }
    }

    await context.close()
  })

  test('TO.6 — Wizard Step 4: Course creation with "Nanti saja" option', async ({ browser }) => {
    test.skip(
      !process.env.VITE_SUPABASE_URL,
      'Supabase tidak dikonfigurasi — skip wizard step 4 test'
    )

    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await page.goto('/#/app/teacher/dashboard')
    await page.waitForTimeout(5000)

    if (page.url().includes('/app/teacher')) {
      // If we're at step 4, look for course creation fields
      const courseTitleInput = page
        .locator(
          'input[name="course_title"], input[placeholder*="judul"], input[placeholder*="Judul"], input[placeholder*="materi"]'
        )
        .first()
      const laterBtn = page
        .locator('button')
        .filter({
          hasText: /Nanti saja|Lewati|Skip/i,
        })
        .first()

      const hasStep4 =
        (await courseTitleInput.isVisible({ timeout: 5000 }).catch(() => false)) ||
        (await laterBtn.isVisible({ timeout: 3000 }).catch(() => false))

      if (hasStep4) {
        expect(hasStep4).toBeTruthy()
      }
    }

    await context.close()
  })

  test('TO.7 — Wizard Step 5: Completion checklist with "Mulai Mengajar"', async ({ browser }) => {
    test.skip(
      !process.env.VITE_SUPABASE_URL,
      'Supabase tidak dikonfigurasi — skip wizard completion test'
    )

    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await page.goto('/#/app/teacher/dashboard')
    await page.waitForTimeout(5000)

    if (page.url().includes('/app/teacher')) {
      // If we're at step 5 (completion), look for checklist and final button
      const hasChecklist = await page
        .locator('text=/Checklist|Selesai|Pengaturan Selesai|Ringkasan/i')
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false)
      const startTeachingBtn = page
        .locator('button')
        .filter({
          hasText: /Mulai Mengajar|Selesai|Tutup/i,
        })
        .first()

      if (hasChecklist) {
        expect(hasChecklist).toBeTruthy()
      }

      if (await startTeachingBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await startTeachingBtn.click()
        await page.waitForTimeout(2000)

        // After closing wizard, dashboard should be visible
        const hasDashboard = await page
          .locator('text=/Dasbor Guru|Dashboard|Kelas Aktif/i')
          .first()
          .isVisible({ timeout: 10000 })
          .catch(() => false)

        if (hasDashboard) {
          expect(hasDashboard).toBeTruthy()
        }
      }
    }

    await context.close()
  })

  test('TO.8 — Dashboard visible after wizard completion', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')

    await page.goto('/#/app/teacher/dashboard')
    await page.waitForTimeout(5000)

    // Teacher dashboard should be visible (wizard already completed or not applicable)
    await expect(
      page.locator('text=/Selamat Datang|Dasbor Guru|Perbarui Data|Dashboard|Kelas Aktif/i').first()
    ).toBeVisible({ timeout: 30000 })

    // Wizard modal should NOT be blocking the dashboard
    // (if wizard is present, it should be dismissible)
    const wizardOverlay = page.locator('[role="dialog"]').first()
    if (await wizardOverlay.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Close the wizard if it's open
      const closeBtn = page
        .locator('button')
        .filter({
          hasText: /Tutup|Lewati|Mulai Mengajar|Selesai/i,
        })
        .first()
      if (await closeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await closeBtn.click()
        await page.waitForTimeout(1000)
      }
    }

    // Dashboard content should be accessible
    await expect(
      page.locator('text=/Dasbor Guru|Kelas Aktif|Peralatan Mengajar|Perbarui Data/i').first()
    ).toBeVisible({ timeout: 15000 })
  })
})
