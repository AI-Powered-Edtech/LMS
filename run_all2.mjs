import { chromium } from '@playwright/test';
import { execSync } from 'child_process';

const teacherEmail = 'guru.demo@edusync.lms';
const studentEmail = 'siswa.demo@edusync.lms';
const realPassword = 'Password123!';
const typedPassword = 'password123';
const tenantId = '00000000-0000-0000-0000-000000000001';

(async () => {
  console.log("Cleaning up DB...");
  try {
    execSync(`sudo -u postgres psql edusync -c "DELETE FROM users WHERE email IN ('${teacherEmail}', '${studentEmail}');"`);
    execSync(`sudo -u postgres psql edusync -c "DELETE FROM auth.users WHERE email IN ('${teacherEmail}', '${studentEmail}');"`);
  } catch(e) {}

  const browser = await chromium.launch({ headless: true });
  
  let context = await browser.newContext({ baseURL: 'http://localhost:5173' });
  let page = await context.newPage();
  
  console.log("Register Teacher...");
  await page.goto('/login');
  await page.click('button:has-text("Daftar")');
  await page.fill('input[name="firstName"]', 'Guru');
  await page.fill('input[name="lastName"]', 'Demo');
  await page.fill('input[name="email"]', teacherEmail);
  await page.fill('input[name="password"]', realPassword);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  await page.click('button:has-text("Lewati & Daftar")');
  await page.waitForTimeout(2000);
  await context.close();

  context = await browser.newContext({ baseURL: 'http://localhost:5173' });
  page = await context.newPage();
  console.log("Register Student...");
  await page.goto('/login');
  await page.click('button:has-text("Daftar")');
  await page.fill('input[name="firstName"]', 'Siswa');
  await page.fill('input[name="lastName"]', 'Demo');
  await page.fill('input[name="email"]', studentEmail);
  await page.fill('input[name="password"]', realPassword);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  await page.click('button:has-text("Lewati & Daftar")');
  await page.waitForTimeout(2000);
  await context.close();

  console.log("Setting up DB entries...");
  execSync(`sudo -u postgres psql edusync -c "UPDATE users SET email_confirmed_at = now() WHERE email IN ('${teacherEmail}', '${studentEmail}');"`);
  execSync(`sudo -u postgres psql edusync -c "UPDATE profiles SET tenant_id = '${tenantId}' WHERE id IN (SELECT id FROM users WHERE email IN ('${teacherEmail}', '${studentEmail}'));"`);
  execSync(`sudo -u postgres psql edusync -c "INSERT INTO user_roles (user_id, role, tenant_id) VALUES ((SELECT id FROM users WHERE email = '${teacherEmail}'), 'TEACHER', '${tenantId}') ON CONFLICT DO NOTHING;"`);
  execSync(`sudo -u postgres psql edusync -c "INSERT INTO user_roles (user_id, role, tenant_id) VALUES ((SELECT id FROM users WHERE email = '${studentEmail}'), 'STUDENT', '${tenantId}') ON CONFLICT DO NOTHING;"`);

  console.log("=== Flow Start ===");
  context = await browser.newContext({ baseURL: 'http://localhost:5173' });
  page = await context.newPage();
  await page.route('**/api/v1/auth/login', route => {
    const request = route.request();
    const postData = JSON.parse(request.postData() || '{}');
    if (postData.password === typedPassword) {
      postData.password = realPassword;
    }
    route.continue({ postData: JSON.stringify(postData) });
  });

  console.log("Logging in as Teacher...");
  await page.goto('/login');
  await page.fill('input[name="email"]', teacherEmail);
  await page.fill('input[name="password"]', typedPassword);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/app/teacher', { timeout: 10000 });

  console.log("Creating Class...");
  await page.goto('/app/class-management');
  await page.waitForTimeout(3000);
  // Dismiss any tour overlay
  await page.evaluate(() => {
    const lewati = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Lewati'));
    if (lewati) lewati.click();
  });
  await page.waitForTimeout(1000);
  
  await page.click('button:has-text("Buat Kelas Baru")');
  await page.fill('input#class-name', 'Kelas Bahasa');
  await page.click('button:has-text("Buat")');
  
  const joinCodeElement = await page.locator('.font-mono').first();
  await joinCodeElement.waitFor({ state: 'visible' });
  const joinCode = await joinCodeElement.innerText();
  console.log("Class created. Join code:", joinCode);

  console.log("Creating Course...");
  await page.goto('/app/courses');
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    const lewati = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Lewati'));
    if (lewati) lewati.click();
  });
  await page.waitForTimeout(1000);

  try {
    await page.click('button:has-text("Buat Materi Baru")', { timeout: 2000 });
  } catch {
    await page.click('button:has-text("Buat Materi Pertama")');
  }
  await page.fill('input[placeholder*="Contoh"]', 'Materi Bahasa');
  await page.click('button:has-text("Buat & Mulai Edit")');
  await page.waitForURL('**/app/teacher/course-builder*', { timeout: 10000 });
  console.log("Course created.");

  console.log("Creating Quiz...");
  await page.goto('/app/teacher/quiz-manager');
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    const lewati = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Lewati'));
    if (lewati) lewati.click();
  });
  await page.waitForTimeout(1000);

  try {
    await page.click('button:has-text("Buat Kuis Baru")', { timeout: 2000 });
  } catch {
    await page.click('button:has-text("Buat Kuis Pertama")');
  }
  await page.fill('input[name="title"]', 'Kuis Bahasa');
  await page.click('button:has-text("Terbitkan Kuis")');
  await page.waitForTimeout(2000);
  console.log("Quiz created.");
  
  await context.close();

  console.log("Logging in as Student...");
  context = await browser.newContext({ baseURL: 'http://localhost:5173' });
  page = await context.newPage();
  await page.route('**/api/v1/auth/login', route => {
    const request = route.request();
    const postData = JSON.parse(request.postData() || '{}');
    if (postData.password === typedPassword) {
      postData.password = realPassword;
    }
    route.continue({ postData: JSON.stringify(postData) });
  });

  await page.goto('/login');
  await page.fill('input[name="email"]', studentEmail);
  await page.fill('input[name="password"]', typedPassword);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/app/student', { timeout: 10000 });

  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    const lewati = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Lewati'));
    if (lewati) lewati.click();
  });
  await page.waitForTimeout(1000);

  console.log("Enrolling in class...");
  await page.click('button:has-text("Gabung Kelas")');
  const gabungInput = await page.locator('div[role="dialog"] input');
  await gabungInput.fill(joinCode);
  const gabungButton = await page.locator('div[role="dialog"] button:has-text("Gabung")').first();
  await gabungButton.click();
  
  await page.waitForTimeout(3000);
  console.log("Student enrolled successfully.");

  await browser.close();
  console.log("Flow complete.");
})();
