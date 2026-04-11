import { test, expect } from '@playwright/test';
import { loginAsStudent, loginAsTeacher, gotoAndWait, skipIfNoAuth } from './helpers'

/**
 * Core LMS Flow E2E Tests
 *
 * Tests the fundamental application shell, navigation, and error handling.
 */

test.describe('Core LMS — Critical Path', () => {

  test.beforeEach(() => {
    skipIfNoAuth()
  })

  test('student: login → courses → tidak crash navigasi', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await loginAsStudent(page)
    await gotoAndWait(page, '/#/app/student/courses')

    await expect(
      page.locator('[data-testid="course-grid"], h1, h2').first()
    ).toBeVisible({ timeout: 8000 })

    // Navigasi ke progress
    await gotoAndWait(page, '/#/app/student/progress')
    const hasProgress = await page.evaluate(() => document.body.textContent!.trim().length > 50)
    expect(hasProgress).toBeTruthy()

    const fatal = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error')
    )
    expect(fatal).toHaveLength(0)
  })

  test('teacher: login → analytics → gradebook → tidak crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await loginAsTeacher(page)
    await gotoAndWait(page, '/#/app/teacher/analytics')

    const hasAnalytics = await page.evaluate(() => document.body.textContent!.trim().length > 50)
    expect(hasAnalytics).toBeTruthy()

    await gotoAndWait(page, '/#/app/teacher/gradebook')
    await expect(
      page.locator('h1, h2, table').first()
    ).toBeVisible({ timeout: 8000 })

    const fatal = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error')
    )
    expect(fatal).toHaveLength(0)
  })

  test('session persistence: refresh tidak kick ke login', async ({ page }) => {
    await loginAsStudent(page)
    await gotoAndWait(page, '/#/app/student/courses')

    // Reload halaman — session harus persist
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Harus masih di courses, bukan redirect ke login
    await expect(page).not.toHaveURL(/login/, { timeout: 5000 })
  })
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
      if (req.url().includes('.js') && !req.url().includes('db')) {
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
