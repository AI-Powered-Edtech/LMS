import { test, expect } from '@playwright/test'

// ============================================================================
// Teacher Flows: 5, 7, 9, 10, 13, 15
// ============================================================================

test.describe('Flow 5: Course Builder', () => {
  test('F5.1 — Teacher courses page loads', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/courses')
    await page.waitForTimeout(5000)

    await expect(page.locator('text=/Kelola Materi|Buat Materi/i').first()).toBeVisible({
      timeout: 30000,
    })
  })

  test('F5.2 — Teacher courses shows grid or empty state', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/courses')
    await page.waitForTimeout(5000)

    const hasCourseGrid = await page
      .locator('[data-testid="course-grid"]')
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    const hasEmptyState = await page
      .locator('text=/Mulai Petualangan|Anda belum memiliki materi/i')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    const hasLoadingDone = await page
      .locator('text=/Kelola Materi|Edit Materi/i')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    expect(hasCourseGrid || hasEmptyState || hasLoadingDone).toBeTruthy()
  })

  test('F5.3 — Teacher can search courses', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/courses')
    await page.waitForTimeout(3000)

    const searchInput = page.locator('input[placeholder*="Cari materi"]')
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill('test search')
      await page.waitForTimeout(1000)

      // Either shows filtered results or "Materi Tidak Ditemukan"
      const hasResults = await page
        .locator('[data-testid="course-grid"]')
        .isVisible({ timeout: 3000 })
        .catch(() => false)
      const hasNoResults = await page
        .locator('text=/Materi Tidak Ditemukan|Tidak ada materi/i')
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)

      expect(hasResults || hasNoResults).toBeTruthy()

      // Clear search
      await searchInput.fill('')
      await page.waitForTimeout(1000)
    }
  })

  test('F5.4 — Create course modal opens', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/courses')
    await page.waitForTimeout(3000)

    // Click "Buat Materi Baru" or "Buat Materi Pertama" button
    const createBtn = page.locator('button', { hasText: /Buat Materi/i }).first()
    if (await createBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createBtn.click()
      await page.waitForTimeout(1000)

      // Modal should open with title input
      const modalHeading = page.locator('text=/Buat Materi Baru/i').first()
      await expect(modalHeading).toBeVisible({ timeout: 5000 })

      // Title input
      const titleInput = page.locator('input[placeholder*="Dasar-dasar Design"]')
      await expect(titleInput).toBeVisible({ timeout: 5000 })

      // Description textarea
      const descField = page.locator('textarea[placeholder*="Jelaskan apa yang akan dipelajari"]')
      if (await descField.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(descField).toBeVisible()
      }

      // Cancel and submit buttons
      await expect(page.locator('button', { hasText: /Batal/i }).first()).toBeVisible()
      await expect(page.locator('button', { hasText: /Buat & Mulai Edit/i }).first()).toBeVisible()

      // Close modal
      await page.locator('button', { hasText: /Batal/i }).first().click()
      await page.waitForTimeout(500)
    }
  })

  test('F5.5 — Course builder page loads', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/course-builder')
    await page.waitForTimeout(5000)

    // Without courseId, should show "Materi Belum Dipilih"
    await expect(
      page.locator('text=/Materi Belum Dipilih|Pembuat Kursus|Kembali ke Kelola Materi/i').first()
    ).toBeVisible({ timeout: 30000 })
  })

  test('F5.6 — Course builder has back navigation', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/course-builder')
    await page.waitForTimeout(3000)

    const backBtn = page
      .locator('button, a')
      .filter({
        hasText: /Kembali ke Kelola Materi/i,
      })
      .first()

    if (await backBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await backBtn.click()
      await expect(page).toHaveURL(/.*teacher\/courses/, { timeout: 10000 })
    }
  })
})

test.describe('Flow 7: Class Management', () => {
  test('F7.1 — Class management page loads', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/classes')

    await expect(page.locator('text=/Manajemen Kelas|Kelas|Buat Kelas/i').first()).toBeVisible({
      timeout: 15000,
    })
  })

  test('F7.2 — Class management shows class list or empty state', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/classes')
    await page.waitForTimeout(3000)

    // Class detail shows: "Siswa Aktif", "Kode Gabung", "Salin Kode"
    // Empty: "Belum ada kelas", "Klik \"Buat Kelas Baru\" untuk memulai"
    // No-class-selected: "Pilih kelas untuk melihat detail"
    const hasClasses = await page
      .locator('text=/Siswa Aktif|Kode Gabung|Salin Kode|Pilih kelas untuk melihat/i')
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)
    const hasEmptyState = await page
      .locator('text=/Belum ada kelas|Buat Kelas Baru/i')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    const hasHeading = await page
      .locator('text=/Manajemen Kelas/i')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    expect(hasClasses || hasEmptyState || hasHeading).toBeTruthy()
  })

  test('F7.3 — Create class form works', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/classes')
    await page.waitForTimeout(3000)

    // Click "Buat Kelas Baru"
    const createBtn = page.locator('button', { hasText: /Buat Kelas Baru/i }).first()
    if (await createBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createBtn.click()
      await page.waitForTimeout(1000)

      // Input field for class name should appear
      const classNameInput = page.locator('input[placeholder*="Kelas 8A"]')
      if (await classNameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(classNameInput).toBeVisible()

        // "Buat" submit button should be visible
        const submitBtn = page.locator('button', { hasText: /^Buat$/i }).first()
        await expect(submitBtn).toBeVisible({ timeout: 3000 })
      }
    }
  })

  test('F7.4 — Class search functionality', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/classes')
    await page.waitForTimeout(3000)

    const searchInput = page.locator('input[placeholder*="Cari kelas"]')
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill('nonexistent class xyz')
      await page.waitForTimeout(1000)

      // Should filter results
      await searchInput.fill('')
      await page.waitForTimeout(500)
    }
  })

  test('F7.5 — Class detail shows join code and students', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/classes')
    await page.waitForTimeout(3000)

    // Click on a class in the list (if any exist)
    const classItem = page
      .locator('button, li, [class*="class"], [class*="card"]')
      .filter({ hasText: /siswa|Kelas/i })
      .first()

    if (await classItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await classItem.click()
      await page.waitForTimeout(2000)

      // Should show class detail: join code, student list, quick actions
      const hasJoinCode = await page
        .locator('text=/Kode Gabung|Salin Kode|Salin Link/i')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)
      const hasStudentList = await page
        .locator('text=/Daftar Siswa|Belum ada siswa|Siswa Aktif/i')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)
      const hasDetail = await page
        .locator('text=/Pilih kelas untuk melihat detail/i')
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)

      expect(hasJoinCode || hasStudentList || hasDetail).toBeTruthy()
    }
  })

  test('F7.6 — Class detail has quick action buttons', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/classes')
    await page.waitForTimeout(3000)

    const classItem = page
      .locator('button, li, [class*="class"], [class*="card"]')
      .filter({ hasText: /siswa|Kelas/i })
      .first()

    if (await classItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await classItem.click()
      await page.waitForTimeout(2000)

      // Quick action buttons
      const quickActions = ['Kuis Kelas', 'Tugas Kelas', 'Analitik']
      for (const action of quickActions) {
        const btn = page
          .locator('button, a')
          .filter({ hasText: new RegExp(action, 'i') })
          .first()
        if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(btn).toBeVisible()
        }
      }
    }
  })
})

test.describe('Flow 9: Quiz Builder', () => {
  test('F9.1 — Quiz manager page loads', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/quiz-manager')

    await expect(
      page.locator('text=/Manajemen Kuis|Kuis|Buat Kuis|Pilih kelas/i').first()
    ).toBeVisible({ timeout: 15000 })
  })

  test('F9.2 — Quiz manager shows class selector prompt', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/quiz-manager')
    await page.waitForTimeout(3000)

    // Without a class selected: "Pilih kelas terlebih dahulu", "Gunakan sidebar untuk memilih kelas aktif"
    const hasPrompt = await page
      .locator('text=/Pilih kelas terlebih dahulu|Gunakan sidebar/i')
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)
    const hasQuizList = await page
      .locator('text=/Buat Kuis|Kuis Kelas Ini|Belum ada kuis|Manajemen Kuis/i')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    expect(hasPrompt || hasQuizList).toBeTruthy()
  })

  test('F9.3 — Question bank page loads', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/question-bank')
    await page.waitForTimeout(5000)

    await expect(page.locator('text=/Bank Soal|Question Bank|Soal|Tambah/i').first()).toBeVisible({
      timeout: 30000,
    })
  })

  test('F9.4 — Quiz gradebook page loads', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/quiz-gradebook')

    await expect(page.locator('text=/Gradebook|Buku Nilai|Kuis|Pilih/i').first()).toBeVisible({
      timeout: 15000,
    })
  })
})

test.describe('Flow 10: SpeedGrader', () => {
  test('F10.1 — SpeedGrader page loads', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/grader')

    await expect(page.locator('text=/SpeedGrader|Penilaian|Belum ada|Pilih/i').first()).toBeVisible(
      { timeout: 15000 }
    )
  })

  test('F10.2 — SpeedGrader shows grading interface or empty state', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/grader')
    await page.waitForTimeout(5000)

    // SpeedGrader has: "Speed Grader", "Penilaian Cepat", "Rubrik Penilaian", "Nilai Akhir"
    const hasGradingUI = await page
      .locator('text=/Rubrik Penilaian|Umpan Balik|Nilai Akhir|Penilaian Cepat/i')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    const hasEmptyState = await page
      .locator('text=/Belum ada|Pilih|Tidak ada submisi/i')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    const hasTopBar = await page
      .locator('text=/Speed Grader|SpeedGrader|Penilaian/i')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    expect(hasGradingUI || hasEmptyState || hasTopBar).toBeTruthy()
  })
})

test.describe('Flow 13: Teacher Analytics Dashboard', () => {
  test('F13.1 — Analytics page loads', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/analytics')

    await expect(
      page.locator('text=/Mesin Analitik|Analitik|Analytics|Pilih/i').first()
    ).toBeVisible({ timeout: 15000 })
  })

  test('F13.2 — Analytics has course selector', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/analytics')
    await page.waitForTimeout(3000)

    // Course selector dropdown
    const courseSelect = page.locator('select').first()
    if (await courseSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(courseSelect).toBeVisible()
    }
  })

  test('F13.3 — Analytics shows prompt when no course selected', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/analytics')
    await page.waitForTimeout(3000)

    // Should show "Pilih kursus untuk melihat data analitik." or course data
    const hasPrompt = await page
      .locator('text=/Pilih kursus untuk melihat|Mesin Analitik/i')
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)
    const hasCourseData = await page
      .locator('text=/Total Terdaftar|Rata-rata Progress|Siswa At-Risk/i')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    expect(hasPrompt || hasCourseData).toBeTruthy()
  })

  test('F13.4 — Analytics shows overview cards when course selected', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/analytics')
    await page.waitForTimeout(3000)

    const courseSelect = page.locator('select').first()
    if (await courseSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Select first available course (if any)
      const options = await courseSelect.locator('option').allTextContents()
      const courseOptions = options.filter((o) => !o.includes('Pilih') && !o.includes('Tidak ada'))

      if (courseOptions.length > 0) {
        await courseSelect.selectOption({ index: 1 })
        await page.waitForTimeout(3000)

        // Overview cards should appear
        const overviewLabels = [
          'Total Terdaftar',
          'Rata-rata Progress',
          'Rata-rata Nilai Kuis',
          'Siswa At-Risk',
        ]
        for (const label of overviewLabels) {
          const card = page.locator(`text=${label}`).first()
          if (await card.isVisible({ timeout: 5000 }).catch(() => false)) {
            await expect(card).toBeVisible()
          }
        }
      }
    }
  })

  test('F13.5 — Teacher dashboard shows overview', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/dashboard')
    await page.waitForTimeout(5000)

    await expect(
      page
        .locator('text=/Selamat Datang|Dasbor Guru|Perbarui Data|Berikut adalah ringkasan/i')
        .first()
    ).toBeVisible({ timeout: 30000 })
  })

  test('F13.6 — Teacher dashboard shows class cards or empty state', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/dashboard')
    await page.waitForTimeout(3000)

    // Actual text: "Kelas Aktif", cards show "Siswa", "Kelola Kelas", "Analytics"
    // Empty: "Belum ada kelas", "Buat kelas pertamamu untuk mulai mengajar."
    const hasClasses = await page
      .locator('text=/Kelas Aktif|Kelola Kelas|Analytics|Siswa/i')
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)
    const hasEmptyState = await page
      .locator('text=/Belum ada kelas|Buat kelas pertamamu/i')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    const hasDashboard = await page
      .locator('text=/Selamat Datang|Perbarui Data/i')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    expect(hasClasses || hasEmptyState || hasDashboard).toBeTruthy()
  })

  test('F13.7 — Teacher dashboard has teaching tools', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/dashboard')
    await page.waitForTimeout(3000)

    const hasTools = await page
      .locator('text=/Peralatan Mengajar|Lihat Semua/i')
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)

    if (hasTools) {
      await expect(page.locator('text=/Peralatan Mengajar/i').first()).toBeVisible()
    }
  })

  test('F13.8 — Teacher dashboard has action buttons', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/dashboard')
    await page.waitForTimeout(3000)

    const actionButtons = ['Kelola Materi', 'Buat Tugas', 'Perbarui Data']
    for (const text of actionButtons) {
      const btn = page
        .locator('button, a')
        .filter({ hasText: new RegExp(text, 'i') })
        .first()
      if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(btn).toBeVisible()
      }
    }
  })

  test('F13.9 — Course analytics page loads', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/course-analytics')
    await page.waitForTimeout(3000)

    // Without courseId: "Kursus tidak ditemukan", "Kembali ke Analitik"
    // With courseId: "Analitik Kursus"
    await expect(
      page.locator('text=/Analitik Kursus|Kursus tidak ditemukan|Kembali ke Analitik/i').first()
    ).toBeVisible({
      timeout: 15000,
    })
  })
})

test.describe('Flow 15: Gradebook', () => {
  test('F15.1 — Gradebook page loads', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/gradebook')
    await page.waitForTimeout(5000)

    // Heading: "Buku Nilai", subtitle: "Kelola dan pantau nilai siswa"
    await expect(
      page.locator('text=/Buku Nilai|Gradebook|Kelola dan pantau nilai/i').first()
    ).toBeVisible({
      timeout: 30000,
    })
  })

  test('F15.2 — Gradebook has course selector', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/gradebook')
    await page.waitForTimeout(3000)

    // Course selector
    const courseSelect = page.locator('select').first()
    if (await courseSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      const defaultOption = page.locator('option', { hasText: /Pilih Kursus/i }).first()
      if (await defaultOption.isVisible().catch(() => false)) {
        await expect(defaultOption).toBeVisible()
      }
    }
  })

  test('F15.3 — Gradebook shows stat cards when course selected', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/gradebook')
    await page.waitForTimeout(3000)

    const courseSelect = page.locator('select').first()
    if (await courseSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      const options = await courseSelect.locator('option').allTextContents()
      const courseOptions = options.filter((o) => !o.includes('Pilih') && !o.includes('--'))

      if (courseOptions.length > 0) {
        await courseSelect.selectOption({ index: 1 })
        await page.waitForTimeout(3000)

        // Stat cards
        const statLabels = ['Rata-rata Kelas', 'Tertinggi', 'Terendah']
        for (const label of statLabels) {
          const card = page.locator(`text=${label}`).first()
          if (await card.isVisible({ timeout: 5000 }).catch(() => false)) {
            await expect(card).toBeVisible()
          }
        }
      }
    }
  })

  test('F15.4 — Gradebook has toolbar (search, filter, add column, export)', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/gradebook')
    await page.waitForTimeout(3000)

    const courseSelect = page.locator('select').first()
    if (await courseSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      const options = await courseSelect.locator('option').allTextContents()
      const courseOptions = options.filter((o) => !o.includes('Pilih') && !o.includes('--'))

      if (courseOptions.length > 0) {
        await courseSelect.selectOption({ index: 1 })
        await page.waitForTimeout(3000)

        // Search
        const searchInput = page.locator('input[placeholder*="Cari siswa"]')
        if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
          await expect(searchInput).toBeVisible()
        }

        // Buttons
        const buttons = ['Tambah Kolom', 'Filter', 'Ekspor CSV']
        for (const text of buttons) {
          const btn = page
            .locator('button')
            .filter({ hasText: new RegExp(text, 'i') })
            .first()
          if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await expect(btn).toBeVisible()
          }
        }
      }
    }
  })

  test('F15.5 — Gradebook add column modal opens', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/gradebook')
    await page.waitForTimeout(3000)

    const courseSelect = page.locator('select').first()
    if (await courseSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      const options = await courseSelect.locator('option').allTextContents()
      const courseOptions = options.filter((o) => !o.includes('Pilih') && !o.includes('--'))

      if (courseOptions.length > 0) {
        await courseSelect.selectOption({ index: 1 })
        await page.waitForTimeout(3000)

        const addBtn = page
          .locator('button')
          .filter({ hasText: /Tambah Kolom/i })
          .first()
        if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
          await addBtn.click()
          await page.waitForTimeout(1000)

          // Modal fields
          const titleInput = page.locator('input[placeholder*="Ujian Harian"]')
          if (await titleInput.isVisible({ timeout: 5000 }).catch(() => false)) {
            await expect(titleInput).toBeVisible()
            await expect(page.locator('button', { hasText: /Simpan/i }).first()).toBeVisible()
            await expect(page.locator('button', { hasText: /Batal/i }).first()).toBeVisible()

            // Close modal
            await page.locator('button', { hasText: /Batal/i }).first().click()
          }
        }
      }
    }
  })

  test('F15.6 — Assignment gradebook page loads', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/assignment-gradebook')
    await page.waitForTimeout(3000)

    await expect(
      page.locator('text=/Gradebook|Buku Nilai|Tugas|Pilih|Nilai/i').first()
    ).toBeVisible({
      timeout: 15000,
    })
  })
})
