import { test, expect } from '@playwright/test'

// Roles that can be run safely
test.describe('Shared & Admin Flows', () => {
  test('Flow 16: Forum / Discussions', async ({ page }) => {
    test.skip(() => test.info().project.name === 'setup', 'Skip setup')
    await page.goto('/#/app/forum')

    // Wait for either the main forum container, the empty state, or loading to finish
    await expect(page.locator('text=/Forum|Diskusi|Belum ada|Diskusi Baru/i').first()).toBeVisible({
      timeout: 15000,
    })
  })

  test('Flow 17: Announcements', async ({ page }) => {
    test.skip(() => test.info().project.name === 'setup', 'Skip setup')
    await page.goto('/#/app/announcements')

    await expect(
      page.locator('text=/Pengumuman|Announcements|Belum ada|Tidak ada/i').first()
    ).toBeVisible({ timeout: 15000 })
  })

  test('Flow 18: Notifications', async ({ page }) => {
    test.skip(() => test.info().project.name === 'setup', 'Skip setup')
    await page.goto('/#/app/notifications')

    await expect(
      page.locator('text=/Notifikasi|Notifications|Belum ada|Kosong/i').first()
    ).toBeVisible({ timeout: 15000 })
  })

  test('Flow 19: Calendar', async ({ page }) => {
    test.skip(() => test.info().project.name === 'setup', 'Skip setup')
    await page.goto('/#/app/calendar')

    // FullCalendar renders '.fc' class, or we might see "Kalender" text
    await expect(
      page.locator('.fc, .fc-view-harness, text=/Kalender|Calendar/i').first()
    ).toBeVisible({ timeout: 15000 })
  })

  test('Flow 23: Profile & Settings', async ({ page }) => {
    test.skip(() => test.info().project.name === 'setup', 'Skip setup')
    await page.goto('/#/app/profile')

    await expect(page.locator('text=/Profil|Profile|Simpan/i').first()).toBeVisible({
      timeout: 15000,
    })
  })

  test('Flow 20: Admin Dashboard', async ({ page }) => {
    test.skip(() => test.info().project.name !== 'admin', 'Only run for admin')
    await page.goto('/#/app/admin/dashboard')

    await expect(page.locator('text=/Admin|Administrasi|Pengguna|Dashboard/i').first()).toBeVisible(
      { timeout: 15000 }
    )
  })
})
