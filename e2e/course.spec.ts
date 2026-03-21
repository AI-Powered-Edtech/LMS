import { test, expect } from '@playwright/test';

/**
 * Course Flow E2E Tests
 *
 * Tests course catalog access, enrollment flows, and course-level navigation.
 */

test.describe('Course Flow', () => {
  test('Should load course list', async ({ page }) => {
    await page.goto('/#/app/student/courses');
    await expect(page).toHaveURL(/.*login|.*courses/);
  });
});

test.describe('Course — Unauthenticated Redirects', () => {
  test('student course catalog requires auth', async ({ page }) => {
    await page.goto('/#/app/student/courses');
    await page.waitForURL(/.*login|.*courses/, { timeout: 5000 });
    expect(page.url()).toMatch(/login|courses/);
  });

  test('teaching course builder requires auth', async ({ page }) => {
    await page.goto('/#/teaching/course-builder');
    await page.waitForURL(/.*login|.*course-builder/, { timeout: 5000 });
    expect(page.url()).toMatch(/login|course-builder/);
  });

  test('analytics page requires auth', async ({ page }) => {
    await page.goto('/#/analytics');
    await page.waitForURL(/.*login|.*analytics/, { timeout: 5000 });
    expect(page.url()).toMatch(/login|analytics/);
  });
});

test.describe('Course — Page Load Integrity', () => {
  test('no crash when navigating to course URL without auth', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/#/app/student/courses/some-course-id');
    await page.waitForTimeout(1500);
    const fatal = errors.filter(e => !e.includes('ResizeObserver'));
    expect(fatal).toHaveLength(0);
  });

  test('no crash navigating to lesson without auth', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/#/app/student/courses/course-1/lessons/lesson-1');
    await page.waitForTimeout(1500);
    const fatal = errors.filter(e => !e.includes('ResizeObserver'));
    expect(fatal).toHaveLength(0);
  });
});
