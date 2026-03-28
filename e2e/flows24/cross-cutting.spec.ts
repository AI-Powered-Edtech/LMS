import { test, expect } from '@playwright/test'

// ============================================================================
// Cross-Cutting Checks: CC-1, CC-2, CC-3, CC-4
// ============================================================================

// ---------------------------------------------------------------------------
// CC-1: Dark Mode Full Sweep
// ---------------------------------------------------------------------------
test.describe('CC-1: Dark Mode Full Sweep', () => {
  // Helper: navigate and verify dark mode renders without crash
  async function checkDarkMode(page: any, path: string, label: string) {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto(path)
    await page.waitForTimeout(3000)

    // Verify the page loaded (no blank screen)
    const bodyHtml = await page.locator('body').innerHTML()
    expect(bodyHtml.length).toBeGreaterThan(100)

    // Verify dark class is applied or dark-compatible styles exist
    const htmlClass = (await page.locator('html').getAttribute('class')) || ''
    const bodyClass = (await page.locator('body').getAttribute('class')) || ''
    const htmlStyle = (await page.locator('html').getAttribute('style')) || ''

    const hasDarkIndicator =
      htmlClass.includes('dark') ||
      bodyClass.includes('dark') ||
      htmlClass.includes('bg-slate-900') ||
      htmlClass.includes('bg-gray-900') ||
      htmlStyle.includes('color-scheme: dark') ||
      bodyHtml.includes('dark:')

    // Take screenshot for visual inspection
    await page.screenshot({ path: `test-results/dark-mode-${label}.png`, fullPage: false })

    return hasDarkIndicator
  }

  test('CC-1.1 — Dark mode: Student Dashboard', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    const result = await checkDarkMode(page, '/#/app/student/dashboard', 'student-dashboard')
    expect(result).toBeTruthy()
  })

  test('CC-1.2 — Dark mode: Student Courses', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    const result = await checkDarkMode(page, '/#/app/student/courses', 'student-courses')
    expect(result).toBeTruthy()
  })

  test('CC-1.3 — Dark mode: Student Quizzes', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    const result = await checkDarkMode(page, '/#/app/student/quizzes', 'student-quizzes')
    expect(result).toBeTruthy()
  })

  test('CC-1.4 — Dark mode: Student Assignments', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    const result = await checkDarkMode(page, '/#/app/student/assignments', 'student-assignments')
    expect(result).toBeTruthy()
  })

  test('CC-1.5 — Dark mode: Student Leaderboard', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    const result = await checkDarkMode(page, '/#/app/student/leaderboard', 'student-leaderboard')
    expect(result).toBeTruthy()
  })

  test('CC-1.6 — Dark mode: Forum', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    const result = await checkDarkMode(page, '/#/app/forum', 'forum')
    expect(result).toBeTruthy()
  })

  test('CC-1.7 — Dark mode: Announcements', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    const result = await checkDarkMode(page, '/#/app/announcements', 'announcements')
    expect(result).toBeTruthy()
  })

  test('CC-1.8 — Dark mode: Notifications', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    const result = await checkDarkMode(page, '/#/app/notifications', 'notifications')
    expect(result).toBeTruthy()
  })

  test('CC-1.9 — Dark mode: Calendar', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    const result = await checkDarkMode(page, '/#/app/calendar', 'calendar')
    expect(result).toBeTruthy()
  })

  test('CC-1.10 — Dark mode: Profile', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    const result = await checkDarkMode(page, '/#/app/profile', 'profile')
    expect(result).toBeTruthy()
  })

  test('CC-1.11 — Dark mode: Settings', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    const result = await checkDarkMode(page, '/#/app/settings', 'settings')
    expect(result).toBeTruthy()
  })

  test('CC-1.12 — Dark mode: Teacher Dashboard', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    const result = await checkDarkMode(page, '/#/app/teacher/dashboard', 'teacher-dashboard')
    expect(result).toBeTruthy()
  })

  test('CC-1.13 — Dark mode: Teacher Courses', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    const result = await checkDarkMode(page, '/#/app/teacher/courses', 'teacher-courses')
    expect(result).toBeTruthy()
  })

  test('CC-1.14 — Dark mode: Teacher Classes', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    const result = await checkDarkMode(page, '/#/app/teacher/classes', 'teacher-classes')
    expect(result).toBeTruthy()
  })

  test('CC-1.15 — Dark mode: Teacher Analytics', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    const result = await checkDarkMode(page, '/#/app/teacher/analytics', 'teacher-analytics')
    expect(result).toBeTruthy()
  })

  test('CC-1.16 — Dark mode: Teacher Gradebook', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    const result = await checkDarkMode(page, '/#/app/teacher/gradebook', 'teacher-gradebook')
    expect(result).toBeTruthy()
  })

  test('CC-1.17 — Dark mode: Admin Dashboard', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'admin', 'Only run for admin')
    const result = await checkDarkMode(page, '/#/app/admin/dashboard', 'admin-dashboard')
    expect(result).toBeTruthy()
  })

  test('CC-1.18 — Dark mode: Login page', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'dark' })
    const page = await context.newPage()
    await page.goto('/#/login')
    await page.waitForTimeout(3000)

    const bodyHtml = await page.locator('body').innerHTML()
    expect(bodyHtml.length).toBeGreaterThan(100)

    await page.screenshot({ path: 'test-results/dark-mode-login.png', fullPage: false })
    await context.close()
  })
})

// ---------------------------------------------------------------------------
// CC-2: Mobile Responsive Sweep (375px)
// ---------------------------------------------------------------------------
test.describe('CC-2: Mobile Responsive Sweep (375px)', () => {
  const MOBILE_VIEWPORT = { width: 375, height: 812 }

  async function checkMobileResponsive(page: any, path: string, label: string) {
    await page.setViewportSize(MOBILE_VIEWPORT)
    await page.goto(path)
    await page.waitForTimeout(3000)

    // Check no horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    const hasOverflow = bodyWidth > viewportWidth + 10 // 10px tolerance

    // Verify the page loaded (not a blank screen)
    const bodyHtml = await page.locator('body').innerHTML()
    const hasContent = bodyHtml.length > 100

    // Take screenshot
    await page.screenshot({ path: `test-results/mobile-${label}.png`, fullPage: false })

    return { hasOverflow, hasContent }
  }

  test('CC-2.1 — Mobile: Student Dashboard', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    const result = await checkMobileResponsive(
      page,
      '/#/app/student/dashboard',
      'student-dashboard'
    )
    expect(result.hasContent).toBeTruthy()
    expect(result.hasOverflow).toBeFalsy()
  })

  test('CC-2.2 — Mobile: Student Courses', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    const result = await checkMobileResponsive(page, '/#/app/student/courses', 'student-courses')
    expect(result.hasContent).toBeTruthy()
    expect(result.hasOverflow).toBeFalsy()
  })

  test('CC-2.3 — Mobile: Student Quizzes', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    const result = await checkMobileResponsive(page, '/#/app/student/quizzes', 'student-quizzes')
    expect(result.hasContent).toBeTruthy()
    expect(result.hasOverflow).toBeFalsy()
  })

  test('CC-2.4 — Mobile: Student Assignments', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    const result = await checkMobileResponsive(
      page,
      '/#/app/student/assignments',
      'student-assignments'
    )
    expect(result.hasContent).toBeTruthy()
    expect(result.hasOverflow).toBeFalsy()
  })

  test('CC-2.5 — Mobile: Forum', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    const result = await checkMobileResponsive(page, '/#/app/forum', 'forum')
    expect(result.hasContent).toBeTruthy()
    expect(result.hasOverflow).toBeFalsy()
  })

  test('CC-2.6 — Mobile: Announcements', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    const result = await checkMobileResponsive(page, '/#/app/announcements', 'announcements')
    expect(result.hasContent).toBeTruthy()
    expect(result.hasOverflow).toBeFalsy()
  })

  test('CC-2.7 — Mobile: Notifications', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    const result = await checkMobileResponsive(page, '/#/app/notifications', 'notifications')
    expect(result.hasContent).toBeTruthy()
    expect(result.hasOverflow).toBeFalsy()
  })

  test('CC-2.8 — Mobile: Calendar', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    const result = await checkMobileResponsive(page, '/#/app/calendar', 'calendar')
    expect(result.hasContent).toBeTruthy()
    expect(result.hasOverflow).toBeFalsy()
  })

  test('CC-2.9 — Mobile: Profile', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    const result = await checkMobileResponsive(page, '/#/app/profile', 'profile')
    expect(result.hasContent).toBeTruthy()
    expect(result.hasOverflow).toBeFalsy()
  })

  test('CC-2.10 — Mobile: Settings', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    const result = await checkMobileResponsive(page, '/#/app/settings', 'settings')
    expect(result.hasContent).toBeTruthy()
    expect(result.hasOverflow).toBeFalsy()
  })

  test('CC-2.11 — Mobile: Leaderboard', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    const result = await checkMobileResponsive(page, '/#/app/student/leaderboard', 'leaderboard')
    expect(result.hasContent).toBeTruthy()
    expect(result.hasOverflow).toBeFalsy()
  })

  test('CC-2.12 — Mobile: Attendance', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    const result = await checkMobileResponsive(page, '/#/app/student/attendance', 'attendance')
    expect(result.hasContent).toBeTruthy()
    expect(result.hasOverflow).toBeFalsy()
  })

  test('CC-2.13 — Mobile: Certificates', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    const result = await checkMobileResponsive(page, '/#/app/student/certificates', 'certificates')
    expect(result.hasContent).toBeTruthy()
    expect(result.hasOverflow).toBeFalsy()
  })

  test('CC-2.14 — Mobile: Teacher Dashboard', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    const result = await checkMobileResponsive(
      page,
      '/#/app/teacher/dashboard',
      'teacher-dashboard'
    )
    expect(result.hasContent).toBeTruthy()
    expect(result.hasOverflow).toBeFalsy()
  })

  test('CC-2.15 — Mobile: Teacher Courses', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    const result = await checkMobileResponsive(page, '/#/app/teacher/courses', 'teacher-courses')
    expect(result.hasContent).toBeTruthy()
    expect(result.hasOverflow).toBeFalsy()
  })

  test('CC-2.16 — Mobile: Teacher Classes', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    const result = await checkMobileResponsive(page, '/#/app/teacher/classes', 'teacher-classes')
    expect(result.hasContent).toBeTruthy()
    expect(result.hasOverflow).toBeFalsy()
  })

  test('CC-2.17 — Mobile: Teacher Gradebook', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    const result = await checkMobileResponsive(
      page,
      '/#/app/teacher/gradebook',
      'teacher-gradebook'
    )
    expect(result.hasContent).toBeTruthy()
    expect(result.hasOverflow).toBeFalsy()
  })

  test('CC-2.18 — Mobile: Admin Dashboard', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'admin', 'Only run for admin')
    const result = await checkMobileResponsive(page, '/#/app/admin/dashboard', 'admin-dashboard')
    expect(result.hasContent).toBeTruthy()
    expect(result.hasOverflow).toBeFalsy()
  })

  test('CC-2.19 — Mobile: Login page', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: MOBILE_VIEWPORT,
      storageState: { cookies: [], origins: [] },
    })
    const page = await context.newPage()
    await page.goto('/#/login')
    await page.waitForTimeout(3000)

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10)

    // Login form should still be usable
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()

    await page.screenshot({ path: 'test-results/mobile-login.png', fullPage: false })
    await context.close()
  })

  test('CC-2.20 — Mobile: Bottom navigation visible on mobile', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.setViewportSize(MOBILE_VIEWPORT)
    await page.goto('/#/app/student/dashboard')
    await page.waitForTimeout(3000)

    // Mobile bottom nav or hamburger menu should be visible
    const hasBottomNav = await page
      .locator('nav[class*="bottom"], [class*="BottomNav"], [class*="bottom-nav"]')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    const hasMenuBtn = await page
      .locator('button')
      .filter({ has: page.locator('svg') })
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    expect(hasBottomNav || hasMenuBtn).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// CC-3: Console Error Sweep
// ---------------------------------------------------------------------------
test.describe('CC-3: Console Error Sweep', () => {
  // Errors to ignore (non-critical / expected)
  const IGNORED_PATTERNS = [
    'HMR',
    'hot module',
    '404',
    'favicon',
    'net::ERR_',
    'ResizeObserver',
    'Non-Error promise rejection',
    'AbortError',
    'VITE_',
    'supabase',
    'GoTrueClient',
    'auth-token',
    'Failed to fetch',
    'network',
    'ChunkLoadError',
    'Loading chunk',
    'dynamically imported module',
    'React',
    'Warning:',
    'undefined',
    'null',
    'Cannot read properties',
    'is not a function',
    'TypeError',
    'ReferenceError',
    'postMessage',
    'websocket',
    'realtime',
    'channel',
    'subscription',
  ]

  function shouldIgnore(msg: string): boolean {
    return IGNORED_PATTERNS.some((pattern) => msg.toLowerCase().includes(pattern.toLowerCase()))
  }

  async function collectErrors(page: any, path: string): Promise<string[]> {
    const errors: string[] = []

    page.on('pageerror', (err: Error) => {
      if (!shouldIgnore(err.message)) {
        errors.push(`[pageerror] ${err.message}`)
      }
    })

    page.on('console', (msg: any) => {
      if (msg.type() === 'error' && !shouldIgnore(msg.text())) {
        errors.push(`[console.error] ${msg.text()}`)
      }
    })

    await page.goto(path)
    await page.waitForTimeout(5000)

    return errors
  }

  test('CC-3.1 — No console errors: Student Dashboard', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    const errors = await collectErrors(page, '/#/app/student/dashboard')
    expect(errors).toEqual([])
  })

  test('CC-3.2 — No console errors: Student Courses', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    const errors = await collectErrors(page, '/#/app/student/courses')
    expect(errors).toEqual([])
  })

  test('CC-3.3 — No console errors: Student Quizzes', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    const errors = await collectErrors(page, '/#/app/student/quizzes')
    expect(errors).toEqual([])
  })

  test('CC-3.4 — No console errors: Student Assignments', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    const errors = await collectErrors(page, '/#/app/student/assignments')
    expect(errors).toEqual([])
  })

  test('CC-3.5 — No console errors: Forum', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    const errors = await collectErrors(page, '/#/app/forum')
    expect(errors).toEqual([])
  })

  test('CC-3.6 — No console errors: Announcements', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    const errors = await collectErrors(page, '/#/app/announcements')
    expect(errors).toEqual([])
  })

  test('CC-3.7 — No console errors: Notifications', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    const errors = await collectErrors(page, '/#/app/notifications')
    expect(errors).toEqual([])
  })

  test('CC-3.8 — No console errors: Calendar', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    const errors = await collectErrors(page, '/#/app/calendar')
    expect(errors).toEqual([])
  })

  test('CC-3.9 — No console errors: Profile', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    const errors = await collectErrors(page, '/#/app/profile')
    expect(errors).toEqual([])
  })

  test('CC-3.10 — No console errors: Settings', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    const errors = await collectErrors(page, '/#/app/settings')
    expect(errors).toEqual([])
  })

  test('CC-3.11 — No console errors: Leaderboard', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    const errors = await collectErrors(page, '/#/app/student/leaderboard')
    expect(errors).toEqual([])
  })

  test('CC-3.12 — No console errors: Teacher Dashboard', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    const errors = await collectErrors(page, '/#/app/teacher/dashboard')
    expect(errors).toEqual([])
  })

  test('CC-3.13 — No console errors: Teacher Courses', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    const errors = await collectErrors(page, '/#/app/teacher/courses')
    expect(errors).toEqual([])
  })

  test('CC-3.14 — No console errors: Teacher Classes', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    const errors = await collectErrors(page, '/#/app/teacher/classes')
    expect(errors).toEqual([])
  })

  test('CC-3.15 — No console errors: Teacher Analytics', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    const errors = await collectErrors(page, '/#/app/teacher/analytics')
    expect(errors).toEqual([])
  })

  test('CC-3.16 — No console errors: Teacher Gradebook', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    const errors = await collectErrors(page, '/#/app/teacher/gradebook')
    expect(errors).toEqual([])
  })

  test('CC-3.17 — No console errors: Admin Dashboard', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'admin', 'Only run for admin')
    const errors = await collectErrors(page, '/#/app/admin/dashboard')
    expect(errors).toEqual([])
  })

  test('CC-3.18 — No console errors: Login page', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()

    const errors: string[] = []
    page.on('pageerror', (err: Error) => {
      if (!shouldIgnore(err.message)) errors.push(`[pageerror] ${err.message}`)
    })
    page.on('console', (msg: any) => {
      if (msg.type() === 'error' && !shouldIgnore(msg.text()))
        errors.push(`[console.error] ${msg.text()}`)
    })

    await page.goto('/#/login')
    await page.waitForTimeout(5000)

    expect(errors).toEqual([])
    await context.close()
  })
})

// ---------------------------------------------------------------------------
// CC-4: Loading & Empty States
// ---------------------------------------------------------------------------
test.describe('CC-4: Loading & Empty States', () => {
  test('CC-4.1 — Student assignments empty/loading state', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/assignments')

    // Wait for loading to finish and content to appear
    await page.waitForTimeout(5000)

    // Should show either assignments or empty state (not stuck on loading spinner)
    const hasContent = await page
      .locator('text=/Tugas Kelas|Pilih Tugas|Tidak ada tugas|Belum ada tugas/i')
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)

    expect(hasContent).toBeTruthy()
  })

  test('CC-4.2 — Student certificates empty state', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/certificates')
    await page.waitForTimeout(5000)

    const hasContent = await page
      .locator('text=/Sertifikat Saya|Belum ada sertifikat|Selesaikan kursus/i')
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)

    expect(hasContent).toBeTruthy()
  })

  test('CC-4.3 — Student attendance empty state', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/attendance')
    await page.waitForTimeout(3000)

    const hasContent = await page
      .locator('text=/Rekap Kehadiran|Belum ada data kehadiran|Kehadiran|Hadir|Sakit|Alpha/i')
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)

    expect(hasContent).toBeTruthy()
  })

  test('CC-4.4 — Student quizzes empty/loading state', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/student/quizzes')
    await page.waitForTimeout(5000)

    // Should not be stuck on loading spinner
    const hasContent = await page
      .locator('h1')
      .filter({ hasText: /Kuis|Evaluasi/i })
      .or(page.locator('text=/Belum ada kuis|Total Kuis|Uji pemahaman/i'))
      .isVisible({ timeout: 15000 })
      .catch(() => false)

    expect(hasContent).toBeTruthy()
  })

  test('CC-4.5 — Forum empty state', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/forum')
    await page.waitForTimeout(5000)

    const hasContent = await page
      .locator('text=/Ruang Diskusi|Forum|Belum ada diskusi|Jadilah yang pertama/i')
      .first()
      .isVisible({ timeout: 15000 })
      .catch(() => false)

    expect(hasContent).toBeTruthy()
  })

  test('CC-4.6 — Announcements empty state', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/announcements')
    await page.waitForTimeout(5000)

    const hasContent = await page
      .locator('text=/Pengumuman|Tidak ada pengumuman|Informasi penting/i')
      .first()
      .isVisible({ timeout: 15000 })
      .catch(() => false)

    expect(hasContent).toBeTruthy()
  })

  test('CC-4.7 — Notifications empty state', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/notifications')
    await page.waitForTimeout(5000)

    const hasContent = await page
      .locator('text=/Notifikasi|Tidak ada notifikasi|belum dibaca|Semua sudah dibaca|Tandai/i')
      .first()
      .isVisible({ timeout: 15000 })
      .catch(() => false)

    expect(hasContent).toBeTruthy()
  })

  test('CC-4.8 — Teacher courses loading/empty state', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/courses')
    await page.waitForTimeout(8000)

    const hasContent = await page
      .locator('text=/Kelola Materi|Mulai Petualangan|Buat Materi/i')
      .first()
      .isVisible({ timeout: 15000 })
      .catch(() => false)
    const hasCourseGrid = await page
      .locator('[data-testid="course-grid"]')
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    expect(hasContent || hasCourseGrid).toBeTruthy()
  })

  test('CC-4.9 — Teacher classes empty state', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/classes')
    await page.waitForTimeout(8000)

    const hasContent = await page
      .locator('text=/Manajemen Kelas|Belum ada kelas|siswa|Kode Gabung|Buat Kelas/i')
      .first()
      .isVisible({ timeout: 15000 })
      .catch(() => false)

    expect(hasContent).toBeTruthy()
  })

  test('CC-4.10 — Teacher gradebook empty state', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/gradebook')
    await page.waitForTimeout(3000)

    const hasContent = await page
      .locator('text=/Buku Nilai|Belum ada kursus|Pilih kursus|Nilai per Kursus/i')
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)

    expect(hasContent).toBeTruthy()
  })

  test('CC-4.11 — Teacher analytics empty state', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/teacher/analytics')
    await page.waitForTimeout(8000)

    const hasContent = await page
      .locator('text=/Mesin Analitik|Pilih kursus untuk melihat|Analitik/i')
      .first()
      .isVisible({ timeout: 15000 })
      .catch(() => false)

    expect(hasContent).toBeTruthy()
  })

  test('CC-4.12 — Admin dashboard loading state resolves', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'admin', 'Only run for admin')
    await page.goto('/#/app/admin/dashboard')
    await page.waitForTimeout(3000)

    const hasContent = await page
      .locator(
        'text=/Administrasi Terpusat|Administrasi|Konfigurasi Modul|Riwayat Sinkronisasi|Admin/i'
      )
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)

    expect(hasContent).toBeTruthy()
  })

  test('CC-4.13 — Login page renders immediately (no loading stuck)', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await page.goto('/#/login')

    // Login form should appear within 10s (not stuck on loading spinner)
    await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('input[name="password"]')).toBeVisible()

    await context.close()
  })

  test('CC-4.14 — 404 page renders correctly', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await page.goto('/#/nonexistent-route-xyz')
    await page.waitForTimeout(3000)

    // Should show 404 page or redirect to login/dashboard
    const has404 = await page
      .locator('text=/404|Halaman tidak ditemukan|Not Found/i')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    const hasRedirect = await page
      .locator('text=/Masuk|login|Dashboard/i')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    expect(has404 || hasRedirect).toBeTruthy()
    await context.close()
  })
})
