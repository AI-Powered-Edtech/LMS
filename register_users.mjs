import { chromium } from '@playwright/test';
import { execSync } from 'child_process';

const teacherEmail = 'guru.demo@edusync.lms';
const studentEmail = 'siswa.demo@edusync.lms';
const tempPassword = 'Password123!';

(async () => {
  // Correct cleanup
  execSync(`sudo -u postgres psql edusync -c "DELETE FROM users WHERE email IN ('${teacherEmail}', '${studentEmail}');"`);
  execSync(`sudo -u postgres psql edusync -c "DELETE FROM auth.users WHERE email IN ('${teacherEmail}', '${studentEmail}');"`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: 'http://localhost:5173' });
  const page = await context.newPage();

  console.log("Register Teacher...");
  await page.goto('/login');
  await page.click('button:has-text("Daftar")');
  await page.fill('input[name="firstName"]', 'Guru');
  await page.fill('input[name="lastName"]', 'Demo');
  await page.fill('input[name="email"]', teacherEmail);
  await page.fill('input[name="password"]', tempPassword);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  await page.click('button:has-text("Lewati & Daftar")');
  await page.waitForSelector('text="Akun berhasil dibuat!"');
  console.log("Teacher registered.");

  execSync(`sudo -u postgres psql edusync -c "UPDATE users SET email_confirmed_at = now() WHERE email = '${teacherEmail}';"`);
  execSync(`sudo -u postgres psql edusync -c "UPDATE user_roles SET role = 'TEACHER' WHERE user_id = (SELECT id FROM users WHERE email = '${teacherEmail}');"`);

  await context.clearCookies();

  console.log("Register Student...");
  await page.goto('/login');
  await page.click('button:has-text("Daftar")');
  await page.fill('input[name="firstName"]', 'Siswa');
  await page.fill('input[name="lastName"]', 'Demo');
  await page.fill('input[name="email"]', studentEmail);
  await page.fill('input[name="password"]', tempPassword);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  await page.click('button:has-text("Lewati & Daftar")');
  await page.waitForSelector('text="Akun berhasil dibuat!"');
  console.log("Student registered.");

  execSync(`sudo -u postgres psql edusync -c "UPDATE users SET email_confirmed_at = now() WHERE email = '${studentEmail}';"`);

  execSync(`sudo -u postgres psql edusync -c "UPDATE auth.users SET encrypted_password = crypt('password123', gen_salt('bf')) WHERE email IN ('${teacherEmail}', '${studentEmail}');"`);
  console.log("Passwords changed to password123.");

  await browser.close();
})();
