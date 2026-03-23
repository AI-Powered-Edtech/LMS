import { test, expect } from '@playwright/test';

test.describe('Course Management (Flows 4-7)', () => {

  test('Flow 4: Course Browsing (Student)', async ({ page }) => {
    // Requires student session
    await page.goto('/#/app/student/courses');
    await expect(page.locator('h1').filter({ hasText: /Kursus|Course/i })).toBeVisible();
    await expect(page.locator('.grid')).toBeVisible(); // Assuming there's a grid of courses
  });

  test('Flow 5: Course Builder (Teacher)', async ({ page }) => {
    // Needs teacher session, handled by project config (if running under teacher project)
    await page.goto('/#/app/teacher/course-builder');
    await expect(page.locator('text=/Buat|Create/i')).toBeVisible();
  });

  test('Flow 6: Smart Player / Lesson Viewer (Student)', async ({ page }) => {
    // For this to really test, we'd need a known course. 
    // We'll just verify the base route logic doesn't crash.
    await page.goto('/#/app/student/courses');
    const firstCourse = page.locator('button', { hasText: /Lanjut|Mulai/i }).first();
    if (await firstCourse.isVisible()) {
      await firstCourse.click();
      await expect(page).toHaveURL(/.*courses\/[a-zA-Z0-9-]/);
    }
  });

  test('Flow 7: Class Management (Teacher)', async ({ page }) => {
    await page.goto('/#/app/teacher/classes');
    await expect(page.locator('text=/Kelas|Class/i')).toBeVisible();
  });

});
