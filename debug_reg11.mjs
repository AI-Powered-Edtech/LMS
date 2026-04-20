import { chromium } from '@playwright/test';
import { execSync } from 'child_process';
const teacherEmail = 'guru.demo@edusync.lms';
const password = 'Password123!';
(async () => {
  execSync(`sudo -u postgres psql edusync -c "DELETE FROM users WHERE email = '${teacherEmail}';"`);
  execSync(`sudo -u postgres psql edusync -c "DELETE FROM auth.users WHERE email = '${teacherEmail}';"`);
  
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
  await page.waitForTimeout(2000);
  await page.click('button:has-text("Lewati & Daftar")');
  await page.waitForTimeout(2000);

  execSync(`sudo -u postgres psql edusync -c "UPDATE users SET email_confirmed_at = now() WHERE email = '${teacherEmail}';"`);

  await page.locator('h3:has-text("Guru")').click();
  await page.waitForTimeout(2000);
  
  const inputs = await page.locator('input[type="text"]').all();
  await inputs[1].fill('Sekolah Demo');
  await page.click('button:has-text("Buat Sekolah & Mulai")');
  await page.waitForTimeout(4000);
  
  console.log("URL:", page.url());
  const text = await page.locator('body').innerText();
  console.log("Text after creating school:", text);
  await browser.close();
})();
