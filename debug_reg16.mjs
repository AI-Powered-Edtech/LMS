import { chromium } from '@playwright/test';
const teacherEmail = 'guru.demo@edusync.lms';
const password = 'Password123!';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: 'http://localhost:5173' });
  const page = await context.newPage();
  
  await page.goto('/login');
  await page.fill('input[name="email"]', teacherEmail);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);

  console.log("URL after login:", page.url());
  const text = await page.locator('body').innerText();
  console.log("Text after login:", text.substring(0, 300));
  await browser.close();
})();
