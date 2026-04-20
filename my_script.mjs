import { chromium } from '@playwright/test';
import { execSync } from 'child_process';

const teacherEmail = 'guru.demo@edusync.lms';
const studentEmail = 'siswa.demo@edusync.lms';
const password = 'password123';

(async () => {
  // Clean up any previous test runs
  try {
    execSync(`sudo -u postgres psql edusync -c "INSERT INTO tenants (id, name, slug) VALUES ('00000000-0000-0000-0000-000000000001', 'Default Tenant', 'default') ON CONFLICT DO NOTHING;"`);
    execSync(`sudo -u postgres psql edusync -c "DELETE FROM auth.users WHERE email IN ('${teacherEmail}', '${studentEmail}');"`);
    execSync(`sudo -u postgres psql edusync -c "DELETE FROM users WHERE email IN ('${teacherEmail}', '${studentEmail}');"`);
  } catch (e) {}

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: 'http://localhost:5173' });
  const page = await context.newPage();
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  console.log("=== 1. Register Teacher ===");
  await page.goto('/login');
  await page.click('button:has-text("Daftar")');
  await page.fill('input[name="firstName"]', 'Guru');
  await page.fill('input[name="lastName"]', 'Demo');
  await page.fill('input[name="email"]', teacherEmail);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  await page.click('button:has-text("Lewati & Daftar")');

  await page.waitForSelector('text="Akun berhasil dibuat!"', { timeout: 10000 });
  console.log("Teacher account registered.");

  // Verify and set role
  execSync(`sudo -u postgres psql edusync -c "UPDATE users SET email_confirmed_at = now() WHERE email = '${teacherEmail}';"`);
  execSync(`sudo -u postgres psql edusync -c "UPDATE user_roles SET role = 'TEACHER' WHERE user_id = (SELECT id FROM users WHERE email = '${teacherEmail}');"`);
  console.log("Teacher activated and promoted to TEACHER role.");

  await page.click('button:has-text("Ke Halaman Login")');
  await page.fill('input[name="email"]', teacherEmail);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]'); // Use submit to be safe

  // Wait for Dashboard to load
  await page.waitForURL('**/app/teacher');
  console.log("Logged in as Teacher.");

  console.log("=== 2. Create Class ===");
  await page.goto('/app/class-management');
  await page.click('button:has-text("Buat Kelas Baru")');
  await page.fill('input#class-name', 'Kelas Automation');
  await page.click('button:has-text("Buat")');

  // Wait for the class code to appear
  const joinCodeElement = await page.locator('.font-mono').first();
  await joinCodeElement.waitFor({ state: 'visible' });
  const joinCode = await joinCodeElement.innerText();
  console.log('Join Code:', joinCode);

  console.log("=== 3. Create Course ===");
  await page.goto('/app/courses');
  // It might be "Buat Materi Pertama" if no courses exist, so use regex or check both
  try {
    await page.click('button:has-text("Buat Materi Baru")', { timeout: 3000 });
  } catch {
    await page.click('button:has-text("Buat Materi Pertama")');
  }
  await page.fill('input[placeholder*="Contoh"]', 'Course Automation');
  await page.click('button:has-text("Buat & Mulai Edit")');

  await page.waitForURL('**/app/teacher/course-builder*');
  console.log("Course created.");

  console.log("=== 4. Create Quiz ===");
  await page.goto('/app/teacher/quiz-manager');
  try {
    await page.click('button:has-text("Buat Kuis Baru")', { timeout: 3000 });
  } catch {
    await page.click('button:has-text("Buat Kuis Pertama")');
  }
  await page.fill('input[name="title"]', 'Quiz Automation');
  await page.click('button:has-text("Terbitkan Kuis")');
  await page.waitForTimeout(2000); // Wait for save
  console.log("Quiz created.");

  console.log("=== 5. Logout ===");
  await context.clearCookies();
  console.log("Cookies cleared.");

  console.log("=== 6. Register Student ===");
  await page.goto('/login');
  await page.click('button:has-text("Daftar")');
  await page.fill('input[name="firstName"]', 'Siswa');
  await page.fill('input[name="lastName"]', 'Demo');
  await page.fill('input[name="email"]', studentEmail);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');

  await page.waitForTimeout(2000);
  await page.click('button:has-text("Lewati & Daftar")');
  await page.waitForSelector('text="Akun berhasil dibuat!"');
  console.log("Student account registered.");

  execSync(`sudo -u postgres psql edusync -c "UPDATE users SET email_confirmed_at = now() WHERE email = '${studentEmail}';"`);

  await page.click('button:has-text("Ke Halaman Login")');
  await page.fill('input[name="email"]', studentEmail);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');

  await page.waitForURL('**/app/student');
  console.log("Logged in as Student.");

  console.log("=== 7. Enroll ===");
  await page.click('button:has-text("Gabung Kelas")');
  await page.fill('input[placeholder="Masukkan kode 6 karakter"]', joinCode); // We might need the exact selector, let's use a general one if not sure
  await page.click('button:has-text("Gabung")'); // Might be "Gabung" or "Gabung Kelas" inside the modal

  await page.waitForTimeout(3000);
  console.log("Enrolled in class!");

  await browser.close();
})();
