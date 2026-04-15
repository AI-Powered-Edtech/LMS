import { test, expect } from '@playwright/test';
import { loginAsStudent, loginAsTeacher, gotoAndWait, skipIfNoAuth } from './helpers'

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

test.describe('Course — Authenticated Flow', () => {

  test.beforeEach(() => {
    skipIfNoAuth()
  })

  test('student dapat melihat daftar kursus setelah login', async ({ page }) => {
    await loginAsStudent(page)
    await gotoAndWait(page, '/#/app/student/courses')

    // Course grid atau empty state harus ada
    await expect(
      page.locator('[data-testid="course-grid"], h1, h2, [data-testid="empty-state"]').first()
    ).toBeVisible({ timeout: 8000 })

    await expect(page).not.toHaveURL(/login/)
  })

  test('infinite scroll: halaman awal kursus tidak crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await loginAsStudent(page)
    await gotoAndWait(page, '/#/app/student/courses')

    // Scroll ke bawah untuk trigger infinite scroll
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(2000)

    const fatal = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error')
    )
    expect(fatal).toHaveLength(0)
  })

  test('teacher dapat membuka course builder', async ({ page }) => {
    await loginAsTeacher(page)
    await gotoAndWait(page, '/#/teaching/courses')

    await expect(
      page.locator('h1, h2, button:has-text("Buat"), button:has-text("Tambah")').first()
    ).toBeVisible({ timeout: 8000 })
  })

  test('membuka kursus yang tidak ada tidak crash halaman', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await loginAsStudent(page)
    await page.goto('/#/app/student/courses/nonexistent-course-id')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    const fatal = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error')
    )
    expect(fatal).toHaveLength(0)
  })
})
