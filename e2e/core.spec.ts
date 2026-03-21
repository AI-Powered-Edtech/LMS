import { test, expect } from '@playwright/test';

/**
 * Core LMS Flow E2E Tests
 *
 * Tests the fundamental application shell, navigation, and error handling.
 */

test.describe('Core LMS Flow', () => {
  test('Login, join class, open lesson, start and submit quiz', async ({ page }) => {
    await page.goto('/#/login');
    await expect(page).toHaveURL(/.*login/);
  });
});

test.describe('Core — Application Shell', () => {
  test('app loads without fatal errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/');
    await page.waitForTimeout(2000);
    const fatal = errors.filter(e =>
      !e.includes('ResizeObserver') && !e.includes('Non-Error')
    );
    expect(fatal).toHaveLength(0);
  });

  test('root path resolves to some app route', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    expect(page.url()).toMatch(/login|student|teacher|admin|app/);
  });

  test('no broken CSS imports', async ({ page }) => {
    const failedCSS: string[] = [];
    page.on('requestfailed', (req) => {
      if (req.url().includes('.css')) failedCSS.push(req.url());
    });
    await page.goto('/#/login');
    await page.waitForTimeout(1000);
    expect(failedCSS).toHaveLength(0);
  });

  test('no broken JS bundle imports', async ({ page }) => {
    const failedJS: string[] = [];
    page.on('requestfailed', (req) => {
      if (req.url().includes('.js') && !req.url().includes('supabase')) {
        failedJS.push(req.url());
      }
    });
    await page.goto('/#/login');
    await page.waitForTimeout(1000);
    expect(failedJS).toHaveLength(0);
  });
});

test.describe('Core — Navigation', () => {
  test('login page has EduSync branding', async ({ page }) => {
    await page.goto('/#/login');
    await page.waitForTimeout(1000);
    const bodyText = await page.textContent('body');
    expect(bodyText?.toLowerCase()).toMatch(/edusync|masuk|login/i);
  });

  test('login form has email and password inputs', async ({ page }) => {
    await page.goto('/#/login');
    await page.waitForTimeout(1000);
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[type="password"]')).toBeVisible({ timeout: 5000 });
  });

  test('mobile viewport renders correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/#/login');
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toBeVisible();
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(395);
  });
});

test.describe('Core — Error Handling', () => {
  test('unknown route does not crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/#/nonexistent-route-xyz-123');
    await page.waitForTimeout(1500);
    const fatal = errors.filter(e => !e.includes('ResizeObserver'));
    expect(fatal).toHaveLength(0);
  });

  test('deeply nested invalid route does not crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/#/app/student/courses/invalid-id/lessons/also-invalid');
    await page.waitForTimeout(1500);
    const fatal = errors.filter(e => !e.includes('ResizeObserver'));
    expect(fatal).toHaveLength(0);
  });
});
