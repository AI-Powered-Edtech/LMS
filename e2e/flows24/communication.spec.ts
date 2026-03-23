import { test, expect } from '@playwright/test';

test.describe('Communication (Flows 16-19)', () => {

  test('Flow 16: Forum / Discussions', async ({ page }) => {
    await page.goto('/#/app/forum');
    await expect(page.locator('text=/Forum|Diskusi/i')).toBeVisible();
    await expect(page.locator('button', { hasText: /Buat|Create/i })).toBeVisible();
  });

  test('Flow 17: Announcements', async ({ page }) => {
    await page.goto('/#/app/announcements');
    await expect(page.locator('text=/Pengumuman|Announcements/i')).toBeVisible();
  });

  test('Flow 18: Notifications', async ({ page }) => {
    await page.goto('/#/app/notifications');
    await expect(page.locator('text=/Notifikasi|Notifications/i')).toBeVisible();
  });

  test('Flow 19: Calendar', async ({ page }) => {
    await page.goto('/#/app/calendar');
    await expect(page.locator('.fc-view-harness').or(page.locator('text=/Kalender|Calendar/i'))).toBeVisible();
  });

});
