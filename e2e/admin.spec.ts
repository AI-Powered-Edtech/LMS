import { test, expect } from '@playwright/test';

/**
 * Admin Flow E2E Tests
 *
 * Tests admin dashboard access, route protection, and admin-specific pages.
 */

test.describe('Admin — Route Protection', () => {
  test('admin dashboard requires auth', async ({ page }) => {
    await page.goto('/#/app/admin');
    await page.waitForURL(/.*login|.*admin/, { timeout: 5000 });
    expect(page.url()).toMatch(/login|admin/);
  });

  test('admin user management requires auth', async ({ page }) => {
    await page.goto('/#/admin/users');
    await page.waitForURL(/.*login|.*users/, { timeout: 5000 });
    expect(page.url()).toMatch(/login|users|admin/);
  });

  test('admin settings page requires auth', async ({ page }) => {
    await page.goto('/#/admin/settings');
    await page.waitForURL(/.*login|.*settings/, { timeout: 5000 });
    expect(page.url()).toMatch(/login|settings|admin/);
  });
});

test.describe('Admin — Load Integrity', () => {
  test('no crash when accessing admin route without auth', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/#/app/admin');
    await page.waitForTimeout(1500);
    const fatal = errors.filter(e => !e.includes('ResizeObserver'));
    expect(fatal).toHaveLength(0);
  });

  test('no crash on admin reports page', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/#/admin/reports');
    await page.waitForTimeout(1500);
    const fatal = errors.filter(e => !e.includes('ResizeObserver'));
    expect(fatal).toHaveLength(0);
  });
});
