import { test, expect } from '@playwright/test';

test.describe('Cross-Cutting Checks (CC-1 to CC-4)', () => {

  test('CC-1: Dark Mode Full Sweep', async ({ page }) => {
    // Override color scheme to dark
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/#/app/student/dashboard');
    
    // Check if the html or body element gets the 'dark' class
    const htmlClass = await page.locator('html').getAttribute('class');
    const bodyClass = await page.locator('body').getAttribute('class');
    expect(htmlClass?.includes('dark') || bodyClass?.includes('dark') || htmlClass?.includes('bg-slate-900')).toBeTruthy();
  });

  test('CC-2: Mobile Responsive Sweep (375px)', async ({ page }) => {
    // iPhone 13 viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/#/app/student/dashboard');
    
    // Check for hamburger menu button (Lucide Menu Icon usually renders an SVG with lucide-menu class, 
    // or it's a button with an aria-label like "Open menu")
    const menuBtn = page.locator('button').filter({ has: page.locator('svg') }).first();
    await expect(menuBtn).toBeVisible();
    
    // Try to open mobile menu
    await menuBtn.click();
    await expect(page.locator('text=/Keluar|Logout/i').first()).toBeVisible();
  });

  test('CC-3: Console Error Sweep', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('HMR') && !msg.text().includes('404')) {
        errors.push(msg.text());
      }
    });

    await page.goto('/#/app/student/dashboard');
    await page.waitForTimeout(2000); // Give it time to hydrate and throw
    
    expect(errors.length).toBe(0);
  });

  test('CC-4: Loading & Empty States', async ({ context, page }) => {
    // Simulate slow network or offline to see AppLoading or OfflineIndicator
    await context.setOffline(true);
    await page.goto('/#/app/student/dashboard', { waitUntil: 'commit' });
    
    // With offline, it should show the offline indicator
    await expect(page.locator('text=/Offline|Luring/i')).toBeVisible();
  });

});
