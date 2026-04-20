import { chromium } from '@playwright/test';
const teacherEmail = 'guru.demo@edusync.lms';
const password = 'Password123!';
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
  await page.click('button:has-text("Daftar")');
  await page.fill('input[name="firstName"]', 'Guru');
  await page.fill('input[name="lastName"]', 'Demo');
  await page.fill('input[name="email"]', teacherEmail);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  await page.click('button:has-text("Lewati & Daftar")');
  await page.waitForTimeout(3000);
  await browser.close();
})();
