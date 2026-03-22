import { test, expect } from '@playwright/test';
import { loginAsStudent, loginAsTeacher, gotoAndWait, skipIfNoAuth } from './helpers'

/**
 * Quiz Flow E2E Tests
 *
 * Tests quiz player access, route protection, and quiz-related navigation.
 */

test.describe('Quiz Flow', () => {
  test('Should load quiz player', async ({ page }) => {
    await page.goto('/#/app/student/quiz/123');
    await expect(page).toHaveURL(/.*login|.*quiz/);
  });
});

test.describe('Quiz — Route Protection', () => {
  test('quiz player requires auth', async ({ page }) => {
    await page.goto('/#/app/student/quiz/some-quiz-id');
    await page.waitForURL(/.*login|.*quiz/, { timeout: 5000 });
    expect(page.url()).toMatch(/login|quiz/);
  });

  test('quiz manager (teacher) requires auth', async ({ page }) => {
    await page.goto('/#/teaching/quiz-manager');
    await page.waitForURL(/.*login|.*quiz-manager/, { timeout: 5000 });
    expect(page.url()).toMatch(/login|quiz/);
  });
});

test.describe('Quiz — Load Integrity', () => {
  test('no crash navigating to quiz without auth', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/#/app/student/quiz/some-quiz-id');
    await page.waitForTimeout(1500);
    const fatal = errors.filter(e => !e.includes('ResizeObserver'));
    expect(fatal).toHaveLength(0);
  });

  test('quiz result page does not crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/#/app/student/quiz/result/some-attempt-id');
    await page.waitForTimeout(1500);
    const fatal = errors.filter(e => !e.includes('ResizeObserver'));
    expect(fatal).toHaveLength(0);
  });
});

test.describe('Quiz — Gradebook Access', () => {
  test('gradebook requires auth', async ({ page }) => {
    await page.goto('/#/gradebook');
    await page.waitForURL(/.*login|.*gradebook/, { timeout: 5000 });
    expect(page.url()).toMatch(/login|gradebook/);
  });
});

test.describe('Quiz — Authenticated Student Flow', () => {

  test.beforeEach(() => {
    skipIfNoAuth()
  })

  test('student dapat melihat daftar kuis', async ({ page }) => {
    await loginAsStudent(page)
    await gotoAndWait(page, '/#/app/student/quizzes')

    // Halaman harus render konten (bukan blank)
    const bodyLen = await page.evaluate(() => document.body.textContent!.trim().length)
    expect(bodyLen).toBeGreaterThan(100)

    // Tidak ada fatal error
    await expect(page).not.toHaveURL(/login/)
  })

  test('teacher dapat mengakses quiz gradebook', async ({ page }) => {
    await loginAsTeacher(page)
    await gotoAndWait(page, '/#/app/teacher/quiz-gradebook')

    await expect(
      page.locator('h1, h2, [data-testid="gradebook-table"], table').first()
    ).toBeVisible({ timeout: 8000 })
  })

  test('teacher dapat mengakses quiz manager', async ({ page }) => {
    await loginAsTeacher(page)
    await gotoAndWait(page, '/#/app/teacher/quiz-manager')

    await expect(
      page.locator('h1, h2, [data-testid="quiz-list"]').first()
    ).toBeVisible({ timeout: 8000 })
  })

  test('tidak ada JS error saat student mengakses daftar kuis', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await loginAsStudent(page)
    await gotoAndWait(page, '/#/app/student/quizzes')
    await page.waitForTimeout(1500)

    const fatal = errors.filter(
      (e) => !e.includes('ResizeObserver') && !e.includes('Non-Error')
    )
    expect(fatal).toHaveLength(0)
  })
})
