import { test, expect } from '@playwright/test';

test.describe('Authentication & Access (Flows 1-3)', () => {
  test('Flow 1 & 3: Role Switching & Tenant Guard (Student)', async ({ page }) => {
    // Already authenticated as student
    await page.goto('/#/app/student/dashboard');
    await expect(page).toHaveURL(/.*\/app\/student\/dashboard/);
    
    // Try to access teacher dashboard (should be redirected/unauthorized)
    await page.goto('/#/app/teacher/dashboard');
    await expect(page).toHaveURL(/.*\/unauthorized|.*\/login/);
  });
  
  test('Flow 2: Registration & Onboarding', async ({ browser }) => {
    // Open a fresh context (unauthenticated)
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/#/login');
    // Assuming there is a "Daftar" button or toggle
    await page.click('text=Daftar');
    await expect(page.locator('form')).toBeVisible();
    await context.close();
  });
});
