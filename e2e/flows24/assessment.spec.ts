import { test, expect } from '@playwright/test';

test.describe('Assessment (Flows 8-11)', () => {

  test('Flow 8: Quiz Taking (Student)', async ({ page }) => {
    await page.goto('/#/app/student/quizzes');
    await expect(page.locator('h1').filter({ hasText: /Kuis|Quiz/i })).toBeVisible();
    // Verify an empty state or a list of quizzes
    const emptyState = page.locator('text=/Belum ada|Empty/i');
    const startBtn = page.locator('button', { hasText: /Mulai Kuis/i }).first();
    await expect(emptyState.or(startBtn)).toBeVisible();
  });

  test('Flow 9: Quiz Builder (Teacher)', async ({ page }) => {
    await page.goto('/#/app/teacher/quiz-manager');
    await expect(page.locator('text=/Buat|Manage|Quiz/i')).toBeVisible();
  });

  test('Flow 10: SpeedGrader (Teacher)', async ({ page }) => {
    await page.goto('/#/app/teacher/grader');
    await expect(page.locator('text=/SpeedGrader|Penilaian/i')).toBeVisible();
  });

  test('Flow 11: Assignments (Student)', async ({ page }) => {
    await page.goto('/#/app/student/assignments');
    await expect(page.locator('h1').filter({ hasText: /Tugas|Assignment/i })).toBeVisible();
  });

});
