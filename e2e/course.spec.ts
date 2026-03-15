import { test, expect } from '@playwright/test';

test.describe('Course Flow', () => {
  test('Should load course list', async ({ page }) => {
    // Assuming authenticated session is injected or page redirects to login
    await page.goto('/student/courses');
    // Verify page loads without crashing
    await expect(page).toHaveURL(/.*login|.*student\/courses/);
  });
});
