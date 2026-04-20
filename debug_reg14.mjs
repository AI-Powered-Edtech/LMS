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
  
  // What is in user_roles?
  const roles = execSync(`sudo -u postgres psql edusync -c "SELECT * FROM user_roles WHERE user_id = (SELECT id FROM users WHERE email = '${teacherEmail}');"`).toString();
  console.log("Roles:", roles);
  
  // Just update it if it exists
  execSync(`sudo -u postgres psql edusync -c "UPDATE user_roles SET role = 'TEACHER' WHERE user_id = (SELECT id FROM users WHERE email = '${teacherEmail}');"`);

  await browser.close();
})();
