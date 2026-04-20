import { chromium } from '@playwright/test';
import { execSync } from 'child_process';

const teacherEmail = 'guru.demo@edusync.lms';
const studentEmail = 'siswa.demo@edusync.lms';
const password = 'Password123!';

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
  page.on('response', async res => {
    if (res.status() >= 400) {
      console.log('API Error:', res.url(), res.status(), await res.text().catch(() => ''));
    }
  });

  console.log("=== 1. Register Teacher ===");
  await page.goto('/login');
  await page.click('button:has-text("Daftar")');
  await page.fill('input[name="firstName"]', 'Guru');
  await page.fill('input[name="lastName"]', 'Demo');
  await page.fill('input[name="email"]', teacherEmail);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'after_lanjut.png' });
  const text = await page.locator('body').innerText();
  if (text.includes('wajib diisi') || text.includes('tidak valid') || text.includes('Password minimal')) {
    console.error("Validation error:", text);
  }
  await page.click('button:has-text("Lewati & Daftar")');
  
  try {
    await page.waitForSelector('text="Akun berhasil dibuat!"', { timeout: 10000 });
  } catch(e) {
    await page.screenshot({ path: 'after_register_step2.png' });
    throw e;
  }
  console.log("Teacher account registered.");
  
  // Verify and set role
  execSync(`sudo -u postgres psql edusync -c "UPDATE users SET email_confirmed_at = now() WHERE email = '${teacherEmail}';"`);
  execSync(`sudo -u postgres psql edusync -c "UPDATE user_roles SET role = 'TEACHER' WHERE user_id = (SELECT id FROM users WHERE email = '${teacherEmail}');"`);
  console.log("Teacher activated and promoted to TEACHER role.");

  await page.click('button:has-text("Ke Halaman Login")');
  await page.fill('input[name="email"]', teacherEmail);
  await page.fill('input[name="password"]', password);
  await page.click('button:has-text("Masuk")');

  // Wait for Dashboard to load
  await page.waitForURL('**/app/teacher');
  console.log("Logged in as Teacher.");

  console.log("=== 2. Create Class ===");
  await page.goto('/app/class-management');
  await page.click('button:has-text("Buat Kelas Baru")');
  await page.fill('input#class-name', 'Kelas Test Automation');
  await page.click('button:has-text("Buat")');
  
  // Wait for the class code to appear
  const joinCodeElement = await page.locator('.font-mono').first();
  await joinCodeElement.waitFor({ state: 'visible' });
  const joinCode = await joinCodeElement.innerText();
  console.log('Join Code:', joinCode);

  console.log("=== 3. Create Course ===");
  await page.goto('/app/courses');
  await page.click('button:has-text("Buat Materi Baru")'); // Wait, the button might be "Buat Materi Pertama" or "Buat Materi Baru"
  
  // Fill the form
  await page.fill('input[placeholder="Contoh: Dasar-dasar Design Thinking"]', 'Course Test Automation');
  await page.click('button:has-text("Buat & Mulai Edit")');
  
  await page.waitForURL('**/app/teacher/course-builder*');
  console.log("Course created and builder opened.");

  // For testing, we can insert a course/quiz into the DB directly for this teacher
  // so the student can actually "complete" it.
  const teacherIdObj = execSync(`sudo -u postgres psql edusync -t -c "SELECT id FROM users WHERE email = '${teacherEmail}' LIMIT 1;"`).toString().trim();
  const tenantIdObj = execSync(`sudo -u postgres psql edusync -t -c "SELECT tenant_id FROM profiles WHERE id = '${teacherIdObj}' LIMIT 1;"`).toString().trim();
  const classIdObj = execSync(`sudo -u postgres psql edusync -t -c "SELECT id FROM classes WHERE name = 'Kelas Test Automation' AND teacher_id = '${teacherIdObj}' LIMIT 1;"`).toString().trim();
  const courseIdObj = execSync(`sudo -u postgres psql edusync -t -c "SELECT id FROM courses WHERE title = 'Course Test Automation' AND created_by = '${teacherIdObj}' LIMIT 1;"`).toString().trim();

  // Create a Quiz and Lesson
  execSync(`sudo -u postgres psql edusync -c "
    INSERT INTO modules (course_id, title, \"order\", tenant_id) VALUES ('${courseIdObj}', 'Module 1', 1, '${tenantIdObj}') RETURNING id;
  "`);
  
  const moduleIdObj = execSync(`sudo -u postgres psql edusync -t -c "SELECT id FROM modules WHERE course_id = '${courseIdObj}' LIMIT 1;"`).toString().trim();
  
  execSync(`sudo -u postgres psql edusync -c "
    INSERT INTO lessons (module_id, title, content, \"order\", tenant_id) VALUES ('${moduleIdObj}', 'Lesson 1', 'Content here', 1, '${tenantIdObj}') RETURNING id;
  "`);

  // Publish the course and assign it
  execSync(`sudo -u postgres psql edusync -c "UPDATE courses SET status = 'published' WHERE id = '${courseIdObj}';"`);
  execSync(`sudo -u postgres psql edusync -c "INSERT INTO course_classes (course_id, class_id, tenant_id) VALUES ('${courseIdObj}', '${classIdObj}', '${tenantIdObj}');"`);

  console.log("Course published and assigned to class.");

  // Logout Teacher
  console.log("Logging out Teacher...");
  await page.goto('/app/teacher'); // Go back to dashboard to access profile menu
  await page.click('button:has-text("T")'); // Or profile icon - wait, let's just clear cookies or goto /login
  await context.clearCookies();
  console.log("Cookies cleared.");

  console.log("=== 4. Register Student ===");
  await page.goto('/login');
  await page.click('button:has-text("Daftar")');
  await page.fill('input[name="firstName"]', 'Siswa');
  await page.fill('input[name="lastName"]', 'Demo');
  await page.fill('input[name="email"]', studentEmail);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');

  console.log("Entering join code...");
  await page.fill('input#reg-join-code', joinCode);
  await page.waitForSelector('text="Kelas ditemukan"');
  await page.click('button:has-text("Daftar & Bergabung")');
  
  await page.waitForSelector('text="Akun berhasil dibuat!"');
  console.log("Student account registered.");

  execSync(`sudo -u postgres psql edusync -c "UPDATE users SET email_confirmed_at = now() WHERE email = '${studentEmail}';"`);

  await page.click('button:has-text("Ke Halaman Login")');
  await page.fill('input[name="email"]', studentEmail);
  await page.fill('input[name="password"]', password);
  await page.click('button:has-text("Masuk")');

  await page.waitForURL('**/app/student');
  console.log("Logged in as Student.");

  // Go to course
  await page.goto('/app/student-class'); // Or whatever the student class page is
  // Or just click the course card
  await page.waitForSelector(`text="Course Test Automation"`);
  await page.click(`text="Course Test Automation"`);

  // Wait for course to open
  console.log("Opened course!");
  await page.waitForTimeout(2000); // just to see
  
  console.log("All steps executed successfully!");
  await browser.close();
})();
