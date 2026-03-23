import { test, expect } from '@playwright/test';

test.describe('Analytics & Gamification', () => {
  // Use project isolation correctly
  test('Flow 12: Student Dashboard & Progress', async ({ page }) => {
    await page.goto('/#/app/student/dashboard');
    // For students, expect XP or Progres
    await expect(page.locator('body')).toContainText(/XP|Progres/i, { timeout: 10000 });
  });

  test('Flow 13: Teacher Analytics Dashboard', async ({ page }) => {
    // Only works if the session is teacher, so we verify we hit unauthorized if not teacher, or success if teacher
    await page.goto('/#/app/teacher/analytics');
    const isUnauthorized = await page.locator('text=/Unauthorized|Kembali/i').count() > 0;
    if (!isUnauthorized) {
      await expect(page.locator('text=/Analitik|Analytics/i')).toBeVisible({ timeout: 10000 });
    }
  });
});
