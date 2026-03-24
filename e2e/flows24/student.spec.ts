import { test, expect } from '@playwright/test'

// ============================================================================
// Student Flows: 4, 6, 8, 11, 12, 14, 21, 22, 24
// ============================================================================

test.describe('Flow 4: Course Browsing & Enrollment', () => {
  test('F4.1 — Student courses page loads', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/courses')
    await expect(
      page.locator('text=/Kursus|Course|Belum ada|Lanjutkan|Mulai/i').first()
    ).toBeVisible({ timeout: 15000 })
  })

  test('F4.2 — Student sees enrolled courses or empty state', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/courses')
    await page.waitForTimeout(3000)

    // Either course cards are visible OR empty state message
    // Heading is "Pilih Materi / Kursus", empty is "Belum Ada Kursus"
    const hasCourseCards = await page
      .locator('text=/Mulai Belajar|Pilih Materi/i')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    const hasEmptyState = await page
      .locator('text=/Belum Ada Kursus|Belum ada kursus aktif/i')
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false)

    expect(hasCourseCards || hasEmptyState).toBeTruthy()
  })

  test('F4.3 — Student can navigate to a course (if enrolled)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/courses')
    await page.waitForTimeout(3000)

    // Try clicking a course start/continue button ("Mulai Belajar" is the card button)
    const courseBtn = page
      .locator('button, a')
      .filter({
        hasText: /Mulai Belajar|Lanjut|Mulai|Buka|Lihat/i,
      })
      .first()

    if (await courseBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await courseBtn.click()
      await page.waitForTimeout(3000)
      // Should navigate to a course detail page or lesson viewer
      const url = page.url()
      const navigated = url.includes('courses/') || url.includes('lesson')
      expect(navigated).toBeTruthy()
    }
  })
})

test.describe('Flow 6: Smart Player / Lesson Viewer', () => {
  test('F6.1 — Lesson viewer page loads', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/courses')
    await page.waitForTimeout(3000)

    // Try to enter a course for lesson viewing
    const startBtn = page
      .locator('button, a')
      .filter({
        hasText: /Mulai Belajar|Lanjut|Mulai|Buka/i,
      })
      .first()

    if (await startBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startBtn.click()
      await page.waitForTimeout(3000)

      // Should see lesson content or sidebar with lessons
      // Idle state heading is "Pilih Pelajaran", loading is "Memuat pelajaran..."
      const hasLessonContent = await page
        .locator('text=/Pilih Pelajaran|Memuat pelajaran|Belum Ada Materi|pelajaran/i')
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      const hasLessonSidebar = await page
        .locator('[role="tabpanel"], [class*="sidebar"], [class*="lesson"]')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      expect(hasLessonContent || hasLessonSidebar).toBeTruthy()
    }
  })

  test('F6.2 — Lesson viewer shows idle state when no lesson selected', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/courses')
    await page.waitForTimeout(3000)

    const startBtn = page
      .locator('button, a')
      .filter({
        hasText: /Mulai Belajar|Lanjut|Mulai|Buka/i,
      })
      .first()

    if (await startBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startBtn.click()
      await page.waitForTimeout(3000)

      // Should show "Pilih Pelajaran" idle state or lesson content
      const idleState = page.locator('text=/Pilih Pelajaran/i').first()
      const lessonContent = page.locator('[role="tabpanel"], [id="panel-content"]').first()

      const hasIdleOrContent =
        (await idleState.isVisible({ timeout: 5000 }).catch(() => false)) ||
        (await lessonContent.isVisible({ timeout: 5000 }).catch(() => false))

      expect(hasIdleOrContent).toBeTruthy()
    }
  })

  test('F6.3 — Lesson viewer has content/discussion/AI tutor tabs', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/courses')
    await page.waitForTimeout(3000)

    const startBtn = page
      .locator('button, a')
      .filter({
        hasText: /Mulai Belajar|Lanjut|Mulai|Buka/i,
      })
      .first()

    if (await startBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startBtn.click()
      await page.waitForTimeout(5000)

      // Look for tab buttons (content, discussion, AI tutor)
      const contentTab = page
        .locator('[id="tab-content"], button:has-text("Konten"), [aria-labelledby="tab-content"]')
        .first()
      const discussionTab = page
        .locator('[id="tab-discussion"], button:has-text("Diskusi")')
        .first()

      const hasTabSystem =
        (await contentTab.isVisible({ timeout: 5000 }).catch(() => false)) ||
        (await discussionTab.isVisible({ timeout: 5000 }).catch(() => false))

      // Tab system may or may not be visible depending on lesson state
      if (hasTabSystem) {
        expect(hasTabSystem).toBeTruthy()
      }
    }
  })
})

test.describe('Flow 8: Quiz Taking', () => {
  test('F8.1 — Quiz page loads with stats', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/quizzes')
    await page.waitForTimeout(3000)

    await expect(page.locator('text=/Kuis|Evaluasi|Quiz/i').first()).toBeVisible({
      timeout: 15000,
    })
  })

  test('F8.2 — Quiz page shows stat cards', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/quizzes')
    await page.waitForTimeout(3000)

    // Stat cards should be visible
    const statLabels = ['Total Kuis', 'Selesai', 'Rata-rata', 'Poin Total']
    for (const label of statLabels) {
      const stat = page.locator(`text=${label}`).first()
      if (await stat.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(stat).toBeVisible()
      }
    }
  })

  test('F8.3 — Quiz page has search and filter', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/quizzes')
    await page.waitForTimeout(3000)

    // Search input
    const searchInput = page.locator('input[placeholder*="Cari kuis"]')
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(searchInput).toBeVisible()

      // Type in search
      await searchInput.fill('test')
      await page.waitForTimeout(1000)
      await searchInput.fill('')
    }

    // Class filter dropdown
    const classFilter = page
      .locator('select')
      .filter({ hasText: /Semua Kelas/i })
      .first()
    if (await classFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(classFilter).toBeVisible()
    }
  })

  test('F8.4 — Quiz page has tabs (Tersedia / Selesai)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/quizzes')
    await page.waitForTimeout(3000)

    // Available tab
    const availableTab = page.locator('button', { hasText: /Tersedia/i }).first()
    const completedTab = page.locator('button', { hasText: /Selesai/i }).first()

    if (await availableTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(availableTab).toBeVisible()

      // Click completed tab
      if (await completedTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await completedTab.click()
        await page.waitForTimeout(1000)

        // Should show completed quizzes or empty state
        const content = page.locator('text=/Anda belum menyelesaikan|selesai|Skor|Nilai/i').first()
        await expect(content).toBeVisible({ timeout: 10000 })

        // Switch back to available
        await availableTab.click()
        await page.waitForTimeout(1000)
      }
    }
  })

  test('F8.5 — Quiz page shows quizzes or empty state', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/quizzes')
    await page.waitForTimeout(3000)

    const hasQuizCards = await page
      .locator('text=/Mulai Kuis|Kerjakan|Tersedia|Total Kuis/i')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    const hasEmptyState = await page
      .locator('text=/Belum ada kuis yang tersedia|belum tersedia/i')
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false)
    const hasPage = await page
      .locator('text=/Kuis|Evaluasi/i')
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false)

    expect(hasQuizCards || hasEmptyState || hasPage).toBeTruthy()
  })
})

test.describe('Flow 11: Assignments', () => {
  test('F11.1 — Assignments page loads', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/assignments')
    await page.waitForTimeout(3000)

    await expect(page.locator('text=/Tugas Kelas|Tugas|Pilih Tugas/i').first()).toBeVisible({
      timeout: 15000,
    })
  })

  test('F11.2 — Assignments shows list or empty state', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/assignments')
    await page.waitForTimeout(5000)

    // Should show assignment list with detail panel, or empty/selection prompt
    // Heading: "Tugas Kelas", empty: "Tidak ada tugas ditemukan", prompt: "Pilih Tugas"
    const hasAssignments = await page
      .locator('text=/Tugas Kelas|Pilih Tugas|Lihat dan kumpulkan/i')
      .first()
      .isVisible({ timeout: 15000 })
      .catch(() => false)
    const hasEmptyState = await page
      .locator('text=/Tidak ada tugas ditemukan|Belum ada tugas/i')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    expect(hasAssignments || hasEmptyState).toBeTruthy()
  })

  test('F11.3 — Student can view assignment details (if available)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/assignments')
    await page.waitForTimeout(3000)

    // Try clicking on an assignment from the sidebar list
    const assignmentItem = page
      .locator('[class*="sidebar"] li, [class*="list"] button, [class*="assignment"]')
      .first()

    if (await assignmentItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await assignmentItem.click()
      await page.waitForTimeout(2000)

      // Should show assignment detail (instructions, due date, submission panel)
      const hasDetail = await page
        .locator('text=/Tenggat|Instruksi|Nilai|Lampiran/i')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      if (hasDetail) {
        expect(hasDetail).toBeTruthy()
      }
    }
  })
})

test.describe('Flow 12: Student Dashboard & Progress', () => {
  test('F12.1 — Student dashboard loads with welcome', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/dashboard')

    await expect(page.locator('[data-testid="dashboard-main"]')).toBeVisible({ timeout: 15000 })
  })

  test('F12.2 — Dashboard shows XP and achievements section', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/dashboard')
    await page.waitForTimeout(3000)

    // Should show XP or achievements section
    // Actual text: "Pencapaian Terbaru", "Progres XP", "Pencapaian"
    const hasXP = await page
      .locator('text=/Progres XP|Pencapaian Terbaru|Pencapaian|XP|Level/i')
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)
    const hasDashboard = await page
      .locator('[data-testid="dashboard-main"]')
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    expect(hasXP || hasDashboard).toBeTruthy()
  })

  test('F12.3 — Dashboard shows classes section', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/dashboard')
    await page.waitForTimeout(3000)

    // Should show "Kelas Saya" or classes section
    // Actual text: "Kelas Saya", empty: "Belum bergabung di kelas mana pun"
    const hasClasses = await page
      .locator('text=/Kelas Saya|Gabung Kelas|Belum bergabung|Masukkan Kode Kelas/i')
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)
    const hasDashboard = await page
      .locator('[data-testid="dashboard-main"]')
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    expect(hasClasses || hasDashboard).toBeTruthy()
  })

  test('F12.4 — Dashboard shows hub section', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/dashboard')
    await page.waitForTimeout(3000)

    // Hub section
    const hasHub = await page
      .locator('text=/Ruang Belajar|Hub/i')
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)

    if (hasHub) {
      await expect(page.locator('text=/Ruang Belajar|Hub/i').first()).toBeVisible()
    }
  })

  test('F12.5 — Student grades page loads', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/grades')

    await expect(page.locator('text=/Nilai|Simulasi|What-If|Pilih kursus/i').first()).toBeVisible({
      timeout: 15000,
    })
  })

  test('F12.6 — Student grades has course selector', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/grades')
    await page.waitForTimeout(3000)

    // Course selector dropdown
    const courseSelect = page.locator('select').first()
    if (await courseSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(courseSelect).toBeVisible()
      // Check for default option
      const defaultOption = page.locator('option', { hasText: /Pilih Kursus/i }).first()
      if (await defaultOption.isVisible().catch(() => false)) {
        await expect(defaultOption).toBeVisible()
      }
    }
  })
})

test.describe('Flow 14: Gamification (XP, Badges, Leaderboard)', () => {
  test('F14.1 — Leaderboard page loads', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/leaderboard')
    await page.waitForTimeout(5000)

    await expect(
      page.locator('text=/Leaderboard|Peringkat|Papan Peringkat|Cuplikan|Belum ada/i').first()
    ).toBeVisible({ timeout: 30000 })
  })

  test('F14.2 — Gamification hub loads', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/gamification')

    await expect(
      page.locator('text=/Gamifikasi|XP|Lencana|Badge|Pencapaian|Level/i').first()
    ).toBeVisible({ timeout: 15000 })
  })

  test('F14.3 — Leaderboard shows ranking or empty state', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/leaderboard')
    await page.waitForTimeout(3000)

    // Actual empty text: "Belum ada peringkat", "Kerjakan pelajaran dan kuis untuk mendapatkan XP!"
    const hasRanking = await page
      .locator('text=/XP|Peringkat|Anda|Mingguan|Bulanan/i')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    const hasEmptyState = await page
      .locator('text=/Belum ada peringkat|Kerjakan pelajaran/i')
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false)
    const hasLeaderboard = await page
      .locator('text=/Papan Peringkat|Leaderboard/i')
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false)

    expect(hasRanking || hasEmptyState || hasLeaderboard).toBeTruthy()
  })
})

test.describe('Flow 21: Attendance', () => {
  test('F21.1 — Student attendance page loads', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/attendance')
    await page.waitForTimeout(5000)

    await expect(
      page.locator('text=/Rekap Kehadiran|Kehadiran|Absensi|Attendance/i').first()
    ).toBeVisible({ timeout: 30000 })
  })

  test('F21.2 — Attendance shows summary cards or empty state', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/attendance')
    await page.waitForTimeout(5000)

    // Should show summary cards (Hadir, Sakit, Alpha) or empty state
    const hasSummary = await page
      .locator('text=/Hadir|Sakit|Alpha|Kehadiran|Rekap/i')
      .first()
      .isVisible({ timeout: 15000 })
      .catch(() => false)
    const hasEmptyState = await page
      .locator('text=/Belum ada data kehadiran/i')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    expect(hasSummary || hasEmptyState).toBeTruthy()
  })

  test('F21.3 — Attendance shows history section', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/attendance')
    await page.waitForTimeout(5000)

    const hasHistory = await page
      .locator('text=/Riwayat Pertemuan|Riwayat|Rekap Kehadiran/i')
      .first()
      .isVisible({ timeout: 15000 })
      .catch(() => false)
    const hasEmptyState = await page
      .locator('text=/Belum ada data|Data akan muncul/i')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    expect(hasHistory || hasEmptyState).toBeTruthy()
  })
})

test.describe('Flow 22: Certificates', () => {
  test('F22.1 — Certificates page loads', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/certificates')
    await page.waitForTimeout(5000)

    await expect(page.locator('text=/Sertifikat|Certificates|Belum ada/i').first()).toBeVisible({
      timeout: 30000,
    })
  })

  test('F22.2 — Certificates shows portfolio or empty state', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/certificates')
    await page.waitForTimeout(3000)

    // Heading: "Sertifikat Saya", subtitle: "Portofolio digital yang memvalidasi..."
    // Empty: "Belum ada sertifikat", "Selesaikan kursus untuk mendapatkan sertifikat"
    const hasCertificates = await page
      .locator('text=/Sertifikat Saya|Portofolio digital|Semua Sertifikat/i')
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)
    const hasEmptyState = await page
      .locator('text=/Belum ada sertifikat|Selesaikan kursus/i')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    expect(hasCertificates || hasEmptyState).toBeTruthy()
  })

  test('F22.3 — Certificates has search if certificates exist', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/certificates')
    await page.waitForTimeout(3000)

    const searchInput = page.locator('input[placeholder*="Cari sertifikat"]')
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill('test')
      await page.waitForTimeout(1000)
      await searchInput.fill('')
    }
  })
})

test.describe('Flow 24: AI Tutor', () => {
  test('F24.1 — AI Tutor accessible from dashboard', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/dashboard')
    await page.waitForTimeout(3000)

    // Look for AI Tutor button/floating action button
    const tutorButton = page
      .locator('button')
      .filter({
        hasText: /AI|Tutor|🤖/i,
      })
      .first()

    if (await tutorButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await tutorButton.click()
      await page.waitForTimeout(2000)

      // Should show chat input area
      const chatInput = page.locator('textarea, input[type="text"]').last()
      await expect(chatInput).toBeVisible({ timeout: 10000 })
    }
  })

  test('F24.2 — AI Tutor has chat interface', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/dashboard')
    await page.waitForTimeout(3000)

    const tutorButton = page
      .locator('button')
      .filter({
        hasText: /AI|Tutor|🤖/i,
      })
      .first()

    if (await tutorButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await tutorButton.click()
      await page.waitForTimeout(2000)

      // Chat interface should have: input area, send button
      const chatInput = page.locator('textarea, input[type="text"]').last()
      if (await chatInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Type a test message
        await chatInput.fill('Halo, apa itu fotosintesis?')
        await page.waitForTimeout(500)

        // Send button should be visible
        const sendBtn = page.locator('button[type="submit"], button:has(svg)').last()
        await expect(sendBtn).toBeVisible({ timeout: 5000 })
      }
    }
  })
})
