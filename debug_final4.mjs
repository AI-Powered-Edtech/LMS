import { chromium } from '@playwright/test';
const teacherEmail = 'guru.demo@edusync.lms';
const finalPassword = 'Password123!';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: 'http://localhost:5173' });
  const page = await context.newPage();
  
  await page.goto('/login');
  await page.fill('input[name="email"]', teacherEmail);
  await page.fill('input[name="password"]', finalPassword);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/app/teacher', { timeout: 10000 });

  await page.goto('/app/class-management');
  await page.waitForTimeout(4000);
  
  console.log("URL:", page.url());
  const text = await page.locator('body').innerText();
  console.log("Text:", text.substring(0, 300));
  await browser.close();
})();
