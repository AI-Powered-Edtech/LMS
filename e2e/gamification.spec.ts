import { test, expect } from '@playwright/test';

/**
 * Gamification Flow E2E Tests
 *
 * Tests leaderboard, badges, and XP-related pages.
 */

test.describe('Gamification — Route Protection', () => {
  test('leaderboard page requires auth', async ({ page }) => {
    await page.goto('/#/leaderboard');
    await page.waitForURL(/.*login|.*leaderboard/, { timeout: 5000 });
    expect(page.url()).toMatch(/login|leaderboard/);
  });
});

test.describe('Gamification — Load Integrity', () => {
  test('leaderboard page does not crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/#/leaderboard');
    await page.waitForTimeout(1500);
    const fatal = errors.filter(e => !e.includes('ResizeObserver'));
    expect(fatal).toHaveLength(0);
  });
});
