import { chromium } from '@playwright/test';
const teacherEmail = 'guru.demo@edusync.lms';
const typedPassword = 'password123';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: 'http://localhost:5173' });
  const page = await context.newPage();
  
  await page.route('**/api/v1/auth/login', route => {
    const request = route.request();
    const postData = JSON.parse(request.postData() || '{}');
    if (postData.password === 'password123') {
      postData.password = 'Password123!'; // Real password
    }
    route.continue({ postData: JSON.stringify(postData) });
  });

  await page.goto('/login');
  await page.fill('input[name="email"]', teacherEmail);
  await page.fill('input[name="password"]', typedPassword);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);

  console.log("URL after login:", page.url());
  const text = await page.locator('body').innerText();
  console.log("Text after login:", text.substring(0, 100));
  await browser.close();
})();
