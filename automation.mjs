import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: 'http://localhost:5173' });
  const page = await context.newPage();

  await page.goto('/login');
  await page.click('button:has-text("Daftar")');
  await page.fill('input[name="firstName"]', 'Test');
  await page.fill('input[name="lastName"]', 'Test');
  await page.fill('input[name="email"]', 'test@test.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(2000);
  const text = await page.locator('body').innerText();
  console.log("Validation error:", text.match(/.*tidak valid.*/gi) || text.match(/.*minimal.*/gi));
  
  await browser.close();
})();
