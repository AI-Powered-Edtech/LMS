import { test, expect } from '@playwright/test';

test.describe('Admin & Settings (Flows 20-24)', () => {

  test('Flow 20: Admin Dashboard', async ({ page }) => {
    // Requires Admin Session
    await page.goto('/#/app/admin/dashboard');
    await expect(page.locator('text=/Admin|Administrasi/i')).toBeVisible();
    await expect(page.locator('text=/Pengguna|Users/i')).toBeVisible();
  });

  test('Flow 21: Attendance', async ({ page }) => {
    await page.goto('/#/app/student/attendance');
    await expect(page.locator('text=/Kehadiran|Absensi|Attendance/i')).toBeVisible();
  });

  test('Flow 22: Certificates', async ({ page }) => {
    await page.goto('/#/app/student/certificates');
    await expect(page.locator('text=/Sertifikat|Certificates/i')).toBeVisible();
  });

  test('Flow 23: Profile & Settings', async ({ page }) => {
    await page.goto('/#/app/profile');
    await expect(page.locator('text=/Profil|Profile/i')).toBeVisible();
    await expect(page.locator('button', { hasText: /Edit|Simpan/i })).toBeVisible();
  });

  test('Flow 24: AI Tutor', async ({ page }) => {
    await page.goto('/#/app/student/dashboard'); // Anywhere the floating tutor exists
    const tutorButton = page.locator('button', { hasText: /AI|Tutor|🤖/i }).first();
    if (await tutorButton.isVisible()) {
      await tutorButton.click();
      await expect(page.locator('textarea').or(page.locator('input[type="text"]')).first()).toBeVisible();
    }
  });

});
