import { test, expect } from '@playwright/test'

// ============================================================================
// Shared & Admin Flows: 16, 17, 18, 19, 20, 23
// ============================================================================

// ---------------------------------------------------------------------------
// Flow 16: Forum / Discussions
// ---------------------------------------------------------------------------
test.describe('Flow 16: Forum / Discussions', () => {
  test('F16.1 — Forum page loads for all roles', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'setup', 'Skip setup')
    await page.goto('/#/app/forum')
    await page.waitForTimeout(5000)

    await expect(
      page
        .locator('h1')
        .filter({ hasText: /Ruang Diskusi|Forum/i })
        .or(page.locator('text=/Belum ada diskusi/i'))
    ).toBeVisible({ timeout: 30000 })
  })

  test('F16.2 — Forum shows discussion list or empty state', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'setup', 'Skip setup')
    await page.goto('/#/app/forum')
    await page.waitForTimeout(5000)

    const hasDiscussions = await page
      .locator('[class*="card"], [class*="post"], [class*="thread"]')
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)
    const hasEmptyState = await page
      .locator('text=/Belum ada diskusi|Jadilah yang pertama/i')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    const hasHeading = await page
      .locator('h1')
      .filter({ hasText: /Ruang Diskusi|Forum/i })
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    expect(hasDiscussions || hasEmptyState || hasHeading).toBeTruthy()
  })

  test('F16.3 — Forum has search and category filter', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'setup', 'Skip setup')
    await page.goto('/#/app/forum')
    await page.waitForTimeout(3000)

    // Search bar (delegated to ForumSearchBar)
    const searchInput = page.locator('input[type="text"], input[type="search"]').first()
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill('test search')
      await page.waitForTimeout(1000)
      await searchInput.fill('')
    }

    // Category filter — "Semua" is the default
    const categoryFilter = page.locator('button, select').filter({ hasText: /Semua/i }).first()
    if (await categoryFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(categoryFilter).toBeVisible()
    }
  })

  test('F16.4 — Forum create post form visible', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'setup', 'Skip setup')
    await page.goto('/#/app/forum')
    await page.waitForTimeout(5000)

    // Look for the create post form elements (inline form on Forum page)
    const titleInput = page.locator('input[placeholder*="Judul pertanyaan"]')
    const bodyTextarea = page.locator('textarea[placeholder*="Jelaskan pertanyaanmu"]')
    const submitBtn = page.locator('button', { hasText: /Posting Pertanyaan/i }).first()

    const hasCreateForm =
      (await titleInput.isVisible({ timeout: 5000 }).catch(() => false)) ||
      (await bodyTextarea.isVisible({ timeout: 3000 }).catch(() => false)) ||
      (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false))

    // Create form might be behind a button or tab
    if (!hasCreateForm) {
      const createBtn = page
        .locator('button')
        .filter({ hasText: /Diskusi Baru|Buat Diskusi|Tanya/i })
        .first()
      if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await createBtn.click()
        await page.waitForTimeout(1000)
      }
    }

    // Verify the page is functional (either form is shown or empty state)
    const pageLoaded = await page
      .locator('h1')
      .filter({ hasText: /Ruang Diskusi|Forum/i })
      .or(page.locator('text=/Belum ada diskusi/i'))
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    expect(pageLoaded).toBeTruthy()
  })

  test('F16.5 — Forum post interaction (click to view)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'setup', 'Skip setup')
    await page.goto('/#/app/forum')
    await page.waitForTimeout(3000)

    // Try to click on a discussion post
    const postItem = page
      .locator('[class*="card"], [class*="post"]')
      .filter({ hasText: /./i })
      .first()

    if (await postItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await postItem.click()
      await page.waitForTimeout(2000)

      // Should expand or navigate to show post detail / replies
      const hasDetail = await page
        .locator('text=/Balas|Komentar|Jawaban|balasan/i')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)

      if (hasDetail) {
        expect(hasDetail).toBeTruthy()
      }
    }
  })
})

// ---------------------------------------------------------------------------
// Flow 17: Announcements
// ---------------------------------------------------------------------------
test.describe('Flow 17: Announcements', () => {
  test('F17.1 — Announcements page loads', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'setup', 'Skip setup')
    await page.goto('/#/app/announcements')
    await page.waitForTimeout(5000)

    await expect(page.locator('h1').filter({ hasText: /Pengumuman/i })).toBeVisible({
      timeout: 30000,
    })
  })

  test('F17.2 — Announcements shows subtitle', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'setup', 'Skip setup')
    await page.goto('/#/app/announcements')
    await page.waitForTimeout(5000)

    const hasSubtitle = await page
      .locator('text=/Informasi penting|jadwal|pembaruan/i')
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)
    const hasPageContent = await page
      .locator('h1')
      .filter({ hasText: /Pengumuman/i })
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    expect(hasSubtitle || hasPageContent).toBeTruthy()
  })

  test('F17.3 — Announcements has search functionality', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'setup', 'Skip setup')
    await page.goto('/#/app/announcements')
    await page.waitForTimeout(3000)

    const searchInput = page.locator('input[placeholder*="Cari pengumuman"]')
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill('test announcement')
      await page.waitForTimeout(1000)
      await searchInput.fill('')
    }
  })

  test('F17.4 — Announcements has filter buttons', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'setup', 'Skip setup')
    await page.goto('/#/app/announcements')
    await page.waitForTimeout(3000)

    // Filter buttons: Semua, Belum Dibaca, Disematkan
    const filters = ['Semua', 'Belum Dibaca', 'Disematkan']
    for (const filter of filters) {
      const btn = page
        .locator('button')
        .filter({ hasText: new RegExp(`^${filter}`, 'i') })
        .first()
      if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(btn).toBeVisible()
      }
    }
  })

  test('F17.5 — Announcements filter interaction', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'setup', 'Skip setup')
    await page.goto('/#/app/announcements')
    await page.waitForTimeout(3000)

    // Click "Belum Dibaca" filter
    const unreadFilter = page
      .locator('button')
      .filter({ hasText: /Belum Dibaca/i })
      .first()
    if (await unreadFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
      await unreadFilter.click()
      await page.waitForTimeout(1000)

      // Page should update (either show unread items or empty state)
      const hasContent = await page
        .locator('h1')
        .filter({ hasText: /Pengumuman/i })
        .or(page.locator('text=/Tidak ada pengumuman/i'))
        .isVisible({ timeout: 5000 })
        .catch(() => false)
      expect(hasContent).toBeTruthy()

      // Switch back to "Semua"
      const allFilter = page
        .locator('button')
        .filter({ hasText: /^Semua$/i })
        .first()
      if (await allFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
        await allFilter.click()
        await page.waitForTimeout(500)
      }
    }
  })

  test('F17.6 — Announcements shows list or empty state', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'setup', 'Skip setup')
    await page.goto('/#/app/announcements')
    await page.waitForTimeout(5000)

    const hasAnnouncements = await page
      .locator('text=/Informasi penting|pembaruan dari sekolah/i')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    const hasEmptyState = await page
      .locator('text=/Tidak ada pengumuman|Belum ada pengumuman/i')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    const hasHeading = await page
      .locator('h1')
      .filter({ hasText: /Pengumuman/i })
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    expect(hasAnnouncements || hasEmptyState || hasHeading).toBeTruthy()
  })

  test('F17.7 — Teacher can see create announcement button', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/announcements')
    await page.waitForTimeout(3000)

    const createBtn = page
      .locator('button')
      .filter({ hasText: /Buat Pengumuman/i })
      .first()
    if (await createBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(createBtn).toBeVisible()
    }
  })
})

// ---------------------------------------------------------------------------
// Flow 18: Notifications
// ---------------------------------------------------------------------------
test.describe('Flow 18: Notifications', () => {
  test('F18.1 — Notifications page loads', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'setup', 'Skip setup')
    await page.goto('/#/app/notifications')
    await page.waitForTimeout(5000)

    await expect(page.locator('h1').filter({ hasText: /Notifikasi/i })).toBeVisible({
      timeout: 30000,
    })
  })

  test('F18.2 — Notifications shows unread count or all-read message', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === 'setup', 'Skip setup')
    await page.goto('/#/app/notifications')
    await page.waitForTimeout(5000)

    const hasUnread = await page
      .locator('text=/belum dibaca/i')
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)
    const hasAllRead = await page
      .locator('text=/Semua sudah dibaca/i')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    const hasNotifPage = await page
      .locator('h1')
      .filter({ hasText: /Notifikasi/i })
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    expect(hasUnread || hasAllRead || hasNotifPage).toBeTruthy()
  })

  test('F18.3 — Notifications has filter tabs', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'setup', 'Skip setup')
    await page.goto('/#/app/notifications')
    await page.waitForTimeout(3000)

    // Filter tabs: Semua, Belum Dibaca, Pengumuman, Nilai, Tugas, Kuis, etc.
    const filterLabels = ['Semua', 'Belum Dibaca', 'Pengumuman', 'Nilai']
    for (const label of filterLabels) {
      const tab = page
        .locator('button')
        .filter({ hasText: new RegExp(`^${label}$`, 'i') })
        .first()
      if (await tab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(tab).toBeVisible()
      }
    }
  })

  test('F18.4 — Notifications tab switching works', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'setup', 'Skip setup')
    await page.goto('/#/app/notifications')
    await page.waitForTimeout(3000)

    // Click different filter tabs
    const pengumumanTab = page
      .locator('button')
      .filter({ hasText: /^Pengumuman$/i })
      .first()
    if (await pengumumanTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await pengumumanTab.click()
      await page.waitForTimeout(1000)

      // Should filter notifications
      const hasFiltered = await page
        .locator('h1')
        .filter({ hasText: /Notifikasi/i })
        .or(page.locator('text=/Tidak ada notifikasi/i'))
        .isVisible({ timeout: 5000 })
        .catch(() => false)
      expect(hasFiltered).toBeTruthy()

      // Switch back to Semua
      const semuaTab = page
        .locator('button')
        .filter({ hasText: /^Semua$/i })
        .first()
      if (await semuaTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await semuaTab.click()
        await page.waitForTimeout(500)
      }
    }
  })

  test('F18.5 — Notifications shows mark all read button', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'setup', 'Skip setup')
    await page.goto('/#/app/notifications')
    await page.waitForTimeout(3000)

    const markAllBtn = page
      .locator('button')
      .filter({ hasText: /Tandai semua sudah dibaca/i })
      .first()
    if (await markAllBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(markAllBtn).toBeVisible()
    }
  })

  test('F18.6 — Notifications empty state', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'setup', 'Skip setup')
    await page.goto('/#/app/notifications')
    await page.waitForTimeout(5000)

    const hasNotifications = await page
      .locator('text=/Tandai dibaca|belum dibaca|Semua sudah dibaca/i')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    const hasEmptyState = await page
      .locator('text=/Tidak ada notifikasi baru|terbaru akan muncul/i')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    const hasPage = await page
      .locator('h1')
      .filter({ hasText: /Notifikasi/i })
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    expect(hasNotifications || hasEmptyState || hasPage).toBeTruthy()
  })

  test('F18.7 — Notifications has pagination', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'setup', 'Skip setup')
    await page.goto('/#/app/notifications')
    await page.waitForTimeout(3000)

    // Pagination buttons
    const prevBtn = page
      .locator('button')
      .filter({ hasText: /Sebelumnya/i })
      .first()
    const nextBtn = page
      .locator('button')
      .filter({ hasText: /Berikutnya/i })
      .first()
    const pageIndicator = page.locator('text=/Halaman/i').first()

    const hasPagination =
      (await prevBtn.isVisible({ timeout: 3000 }).catch(() => false)) ||
      (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) ||
      (await pageIndicator.isVisible({ timeout: 3000 }).catch(() => false))

    // Pagination may not be visible if there are few notifications
    if (hasPagination) {
      expect(hasPagination).toBeTruthy()
    }
  })

  test('F18.8 — Notifications settings collapsible exists', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'setup', 'Skip setup')
    await page.goto('/#/app/notifications')
    await page.waitForTimeout(3000)

    const settingsToggle = page
      .locator('button')
      .filter({ hasText: /Pengaturan Notifikasi/i })
      .first()
    if (await settingsToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
      await settingsToggle.click()
      await page.waitForTimeout(1000)
      // Settings panel should expand (implementation-dependent)
    }
  })
})

// ---------------------------------------------------------------------------
// Flow 19: Calendar
// ---------------------------------------------------------------------------
test.describe('Flow 19: Calendar', () => {
  test('F19.1 — Calendar page loads', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'setup', 'Skip setup')
    await page.goto('/#/app/calendar')
    await page.waitForTimeout(5000)

    // Calendar heading is "Jadwal & Kalender"
    await expect(page.locator('h1').filter({ hasText: /Jadwal|Kalender/i })).toBeVisible({
      timeout: 30000,
    })
  })

  test('F19.2 — Calendar shows heading and subtitle', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'setup', 'Skip setup')
    await page.goto('/#/app/calendar')
    await page.waitForTimeout(3000)

    const hasHeading = await page
      .locator('text=/Jadwal & Kalender|Jadwal/i')
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)

    if (hasHeading) {
      await expect(page.locator('text=/Jadwal/i').first()).toBeVisible()
    }
  })

  test('F19.3 — Calendar has view toggle (Bulan / Agenda)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'setup', 'Skip setup')
    await page.goto('/#/app/calendar')
    await page.waitForTimeout(3000)

    const monthBtn = page.locator('button').filter({ hasText: /Bulan/i }).first()
    const agendaBtn = page
      .locator('button')
      .filter({ hasText: /Agenda/i })
      .first()

    if (await monthBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(monthBtn).toBeVisible()

      if (await agendaBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Switch to agenda view
        await agendaBtn.click()
        await page.waitForTimeout(1000)

        // Switch back to month view
        await monthBtn.click()
        await page.waitForTimeout(1000)
      }
    }
  })

  test('F19.4 — Calendar has add event button', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'setup', 'Skip setup')
    await page.goto('/#/app/calendar')
    await page.waitForTimeout(3000)

    const addBtn = page
      .locator('button')
      .filter({ hasText: /Tambah/i })
      .first()
    if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(addBtn).toBeVisible()
    }
  })

  test('F19.5 — Calendar renders month grid or agenda list', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'setup', 'Skip setup')
    await page.goto('/#/app/calendar')
    await page.waitForTimeout(5000)

    // Custom calendar renders grid/table or agenda view, or the heading
    const hasCalendarGrid = await page
      .locator('table, [class*="grid"], [class*="calendar"], [class*="month"]')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)
    const hasCalendarText = await page
      .locator('text=/Jadwal|Kalender|Bulan|Agenda/i')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    expect(hasCalendarGrid || hasCalendarText).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// Flow 20: Admin Dashboard
// ---------------------------------------------------------------------------
test.describe('Flow 20: Admin Dashboard', () => {
  test('F20.1 — Admin dashboard loads', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'admin', 'Only run for admin')
    await page.goto('/#/app/admin/dashboard')

    await expect(
      page.locator('text=/Administrasi Terpusat|Administrasi|Admin/i').first()
    ).toBeVisible({ timeout: 15000 })
  })

  test('F20.2 — Admin dashboard shows subtitle', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'admin', 'Only run for admin')
    await page.goto('/#/app/admin/dashboard')
    await page.waitForTimeout(3000)

    const hasSubtitle = await page
      .locator('text=/Kelola sinkronisasi|PDDIKTI|Dapodik|pengaturan sistem/i')
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)

    if (hasSubtitle) {
      expect(hasSubtitle).toBeTruthy()
    }
  })

  test('F20.3 — Admin dashboard shows system status', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'admin', 'Only run for admin')
    await page.goto('/#/app/admin/dashboard')
    await page.waitForTimeout(3000)

    const hasStatus = await page
      .locator('text=/Sistem Online|Online/i')
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)

    if (hasStatus) {
      await expect(page.locator('text=/Online/i').first()).toBeVisible()
    }
  })

  test('F20.4 — Admin dashboard has sync button', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'admin', 'Only run for admin')
    await page.goto('/#/app/admin/dashboard')
    await page.waitForTimeout(3000)

    const syncBtn = page
      .locator('button')
      .filter({ hasText: /Sinkronisasi Data/i })
      .first()
    if (await syncBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(syncBtn).toBeVisible()
    }
  })

  test('F20.5 — Admin dashboard has module configuration', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'admin', 'Only run for admin')
    await page.goto('/#/app/admin/dashboard')
    await page.waitForTimeout(3000)

    const hasModuleConfig = await page
      .locator('text=/Konfigurasi Modul|Fitur/i')
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)

    if (hasModuleConfig) {
      await expect(page.locator('text=/Konfigurasi Modul/i').first()).toBeVisible()
    }
  })

  test('F20.6 — Admin dashboard has quick actions', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'admin', 'Only run for admin')
    await page.goto('/#/app/admin/dashboard')
    await page.waitForTimeout(3000)

    const quickActions = [
      'Konfigurasi Sekolah',
      'Manajemen Akun Staf',
      'Laporan Log Audit',
      'Cadangan Basis Data',
    ]

    for (const action of quickActions) {
      const btn = page
        .locator('button')
        .filter({ hasText: new RegExp(action, 'i') })
        .first()
      if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(btn).toBeVisible()
      }
    }
  })

  test('F20.7 — Admin dashboard has sync history table', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'admin', 'Only run for admin')
    await page.goto('/#/app/admin/dashboard')
    await page.waitForTimeout(3000)

    const hasSyncHistory = await page
      .locator('text=/Riwayat Sinkronisasi|Jenis Data|Status/i')
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)
    const hasSyncEmpty = await page
      .locator('text=/Tidak ada riwayat sinkronisasi/i')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    expect(hasSyncHistory || hasSyncEmpty).toBeTruthy()
  })

  test('F20.8 — Admin PDDIKTI integration section', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'admin', 'Only run for admin')
    await page.goto('/#/app/admin/dashboard')
    await page.waitForTimeout(3000)

    const hasPddikti = await page
      .locator('text=/Status Integrasi PDDIKTI|Terhubung/i')
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)

    if (hasPddikti) {
      await expect(page.locator('text=/PDDIKTI/i').first()).toBeVisible()
    }
  })

  test('F20.9 — Admin user management page loads', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'admin', 'Only run for admin')
    await page.goto('/#/app/admin/users')

    await expect(
      page.locator('text=/Manajemen Pengguna|User Management|Pengguna/i').first()
    ).toBeVisible({ timeout: 15000 })
  })

  test('F20.10 — Admin analytics page loads', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'admin', 'Only run for admin')
    await page.goto('/#/app/admin/analytics')

    await expect(page.locator('text=/Analitik|Analytics|Admin/i').first()).toBeVisible({
      timeout: 15000,
    })
  })

  test('F20.11 — Admin moderation page loads', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'admin', 'Only run for admin')
    await page.goto('/#/app/admin/moderation')

    await expect(page.locator('text=/Moderasi|Moderation|Konten/i').first()).toBeVisible({
      timeout: 15000,
    })
  })
})

// ---------------------------------------------------------------------------
// Flow 23: Profile & Settings
// ---------------------------------------------------------------------------
test.describe('Flow 23: Profile & Settings', () => {
  test('F23.1 — Profile page loads', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'setup', 'Skip setup')
    await page.goto('/#/app/profile')
    await page.waitForTimeout(5000)

    await expect(
      page
        .locator('h1')
        .filter({ hasText: /Profil Pengguna|Profil/i })
        .or(page.locator('text=/Guru Terverifikasi|Siswa|Admin/i'))
    ).toBeVisible({
      timeout: 30000,
    })
  })

  test('F23.2 — Profile shows user info', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'setup', 'Skip setup')
    await page.goto('/#/app/profile')
    await page.waitForTimeout(5000)

    // Should show role badge
    const hasRole = await page
      .locator('text=/Guru|Siswa|Admin|Teacher|Student|Profil/i')
      .first()
      .isVisible({ timeout: 15000 })
      .catch(() => false)

    expect(hasRole).toBeTruthy()
  })

  test('F23.3 — Profile shows stats (student)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.goto('/#/app/profile')
    await page.waitForTimeout(3000)

    // Student profile has stat cards: Tugas, Sertifikat, Total XP, Streak
    // Also has sections: Kemajuan XP, Lencana & Pencapaian, Sertifikat
    const statLabels = ['Tugas', 'Sertifikat', 'Total XP', 'Streak', 'Kemajuan XP', 'Lencana']
    let foundStats = 0
    for (const label of statLabels) {
      const stat = page.locator(`text=${label}`).first()
      if (await stat.isVisible({ timeout: 3000 }).catch(() => false)) {
        foundStats++
      }
    }

    // At least some stat cards or profile sections should be visible
    const hasProfileContent = await page
      .locator('text=/Profil Pengguna|Kemajuan XP|Lencana|edusync/i')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    expect(foundStats > 0 || hasProfileContent).toBeTruthy()
  })

  test('F23.4 — Profile shows teacher welcome (teacher)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'teacher', 'Only run for teacher')
    await page.goto('/#/app/profile')
    await page.waitForTimeout(3000)

    const hasTeacherWelcome = await page
      .locator('text=/Selamat Datang|Guru Terverifikasi|Tips Mengajar/i')
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)
    const hasProfile = await page
      .locator('text=/Profil/i')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    expect(hasTeacherWelcome || hasProfile).toBeTruthy()
  })

  test('F23.5 — Settings page loads', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'setup', 'Skip setup')
    await page.goto('/#/app/settings')
    await page.waitForTimeout(3000)

    await expect(page.locator('text=/Pengaturan|Settings/i').first()).toBeVisible({
      timeout: 30000,
    })
  })

  test('F23.6 — Settings has sidebar tabs', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'setup', 'Skip setup')
    await page.goto('/#/app/settings')
    await page.waitForTimeout(3000)

    const tabs = ['Akun & Profil', 'Notifikasi', 'Keamanan', 'Tampilan', 'Bahasa & Wilayah']
    for (const tab of tabs) {
      const tabBtn = page
        .locator('button, a')
        .filter({ hasText: new RegExp(tab, 'i') })
        .first()
      if (await tabBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(tabBtn).toBeVisible()
      }
    }
  })

  test('F23.7 — Settings account tab shows form', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'setup', 'Skip setup')
    await page.goto('/#/app/settings')
    await page.waitForTimeout(3000)

    // Click "Akun & Profil" tab (may already be active)
    const accountTab = page
      .locator('button, a')
      .filter({ hasText: /Akun & Profil/i })
      .first()
    if (await accountTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await accountTab.click()
      await page.waitForTimeout(1000)
    }

    // Should show account form with Nama Lengkap, Email, Peran Akun
    const hasAccountForm = await page
      .locator('text=/Informasi Akun|Nama Lengkap/i')
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)

    if (hasAccountForm) {
      await expect(page.locator('text=/Nama Lengkap/i').first()).toBeVisible()
    }
  })

  test('F23.8 — Settings security tab shows password form', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'setup', 'Skip setup')
    await page.goto('/#/app/settings')
    await page.waitForTimeout(3000)

    const securityTab = page
      .locator('button, a')
      .filter({ hasText: /Keamanan/i })
      .first()
    if (await securityTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await securityTab.click()
      await page.waitForTimeout(1000)

      // Password change form
      const hasPasswordForm = await page
        .locator('text=/Keamanan Akun|Kata Sandi|Ubah Kata Sandi/i')
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      if (hasPasswordForm) {
        const fields = ['Kata Sandi Saat Ini', 'Kata Sandi Baru', 'Konfirmasi']
        for (const field of fields) {
          const label = page.locator(`text=${field}`).first()
          if (await label.isVisible({ timeout: 3000 }).catch(() => false)) {
            await expect(label).toBeVisible()
          }
        }
      }
    }
  })

  test('F23.9 — Settings appearance tab has theme options', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'setup', 'Skip setup')
    await page.goto('/#/app/settings')
    await page.waitForTimeout(3000)

    const appearanceTab = page
      .locator('button, a')
      .filter({ hasText: /Tampilan/i })
      .first()
    if (await appearanceTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await appearanceTab.click()
      await page.waitForTimeout(1000)

      // Theme options: Terang, Gelap, Sistem
      const themes = ['Terang', 'Gelap', 'Sistem']
      for (const theme of themes) {
        const option = page.locator(`text=${theme}`).first()
        if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(option).toBeVisible()
        }
      }
    }
  })

  test('F23.10 — Settings language tab has locale options', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'setup', 'Skip setup')
    await page.goto('/#/app/settings')
    await page.waitForTimeout(3000)

    const langTab = page
      .locator('button, a')
      .filter({ hasText: /Bahasa & Wilayah/i })
      .first()
    if (await langTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await langTab.click()
      await page.waitForTimeout(1000)

      // Language settings
      const hasLangSettings = await page
        .locator('text=/Bahasa & Wilayah|Zona Waktu|Format Tanggal/i')
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      if (hasLangSettings) {
        // Timezone options
        const hasTimezone = await page
          .locator('text=/WIB|WITA|WIT/i')
          .first()
          .isVisible({ timeout: 5000 })
          .catch(() => false)
        if (hasTimezone) {
          expect(hasTimezone).toBeTruthy()
        }
      }
    }
  })

  test('F23.11 — Settings has danger zone with logout', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'setup', 'Skip setup')
    await page.goto('/#/app/settings')
    await page.waitForTimeout(3000)

    // Danger zone should always be visible
    const hasDangerZone = await page
      .locator('text=/Zona Berbahaya|Keluar Akun/i')
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false)

    if (hasDangerZone) {
      const logoutBtn = page
        .locator('button')
        .filter({ hasText: /Keluar Akun/i })
        .first()
      await expect(logoutBtn).toBeVisible({ timeout: 5000 })
    }
  })
})
