import { chromium } from '@playwright/test';
const teacherEmail = 'guru.demo@edusync.lms';
const finalPassword = 'password123';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: 'http://localhost:5173' });
  const page = await context.newPage();
  
  page.on('response', async res => {
    if (res.status() >= 400) {
      console.log('API Error:', res.url(), res.status(), await res.text().catch(() => ''));
    }
  });

  await page.goto('/login');
  await page.fill('input[name="email"]', teacherEmail);
  await page.fill('input[name="password"]', finalPassword);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);

  console.log("URL after login:", page.url());
  await browser.close();
})();
