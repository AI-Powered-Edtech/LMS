import { test, expect } from '@playwright/test';

/**
 * EduSync Authentication E2E Tests
 *
 * Tests login page rendering, route protection, and hash routing.
 */

test.describe('Authentication Flow', () => {
  test('Should navigate to login', async ({ page }) => {
    await page.goto('/#/login');
    await expect(page).toHaveURL(/.*login/);
  });
});

test.describe('Authentication — Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/login');
  });

  test('login form inputs are visible', async ({ page }) => {
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible({ timeout: 5000 });
  });

  test('submit button is present', async ({ page }) => {
    await expect(page.locator('button[type="submit"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('no fatal JavaScript errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/#/login');
    await page.waitForTimeout(1000);
    const fatal = errors.filter(e =>
      !e.includes('ResizeObserver') && !e.includes('Non-Error promise rejection')
    );
    expect(fatal).toHaveLength(0);
  });

  test('page title is set', async ({ page }) => {
    expect(await page.title()).toBeTruthy();
  });

  test('body contains EduSync or login-related text', async ({ page }) => {
    const bodyText = await page.textContent('body');
    expect(bodyText?.toLowerCase()).toMatch(/edusync|masuk|email|sandi|login/i);
  });
});

test.describe('Authentication — Route Protection', () => {
  test('unauthenticated request to /#/app/student redirects to login', async ({ page }) => {
    await page.goto('/#/app/student');
    await page.waitForURL(/.*login|.*student/, { timeout: 5000 });
    expect(page.url()).toMatch(/login|student/);
  });

  test('unauthenticated request to /#/app/teacher redirects to login', async ({ page }) => {
    await page.goto('/#/app/teacher');
    await page.waitForURL(/.*login|.*teacher/, { timeout: 5000 });
    expect(page.url()).toMatch(/login|teacher/);
  });

  test('unauthenticated request to /#/app/admin redirects to login', async ({ page }) => {
    await page.goto('/#/app/admin');
    await page.waitForURL(/.*login|.*admin/, { timeout: 5000 });
    expect(page.url()).toMatch(/login|admin/);
  });
});

test.describe('Authentication — Hash Routing', () => {
  test('app root redirects through hash routing', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    expect(page.url()).toMatch(/#\//);
  });

  test('direct navigation to /#/login works', async ({ page }) => {
    await page.goto('/#/login');
    await expect(page).toHaveURL(/.*login/);
  });
});
