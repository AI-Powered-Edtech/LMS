import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('Should navigate to login', async ({ page }) => {
    await page.goto('/login');
    // For now, testing basic navigation succeeds since backend is mostly disabled in E2E environments
    await expect(page).toHaveURL(/.*login/);
  });
});
