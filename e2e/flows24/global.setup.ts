import { test as setup, expect } from '@playwright/test';
import * as fs from 'fs';

const studentAuth = 'e2e/.auth/student.json';
const teacherAuth = 'e2e/.auth/teacher.json';
const adminAuth = 'e2e/.auth/admin.json';

async function login(page: any, role: string, file: string) {
  if (fs.existsSync(file)) return;
  
  await page.goto('/#/login');
  
  await page.locator('input[name="email"]').click();
  await page.keyboard.type(`${role}@edusync.dev`, { delay: 10 });
  
  await page.locator('input[name="password"]').click();
  await page.keyboard.type('password123', { delay: 10 });
  
  await page.locator('button[type="submit"]').click();
  
  await expect(page).not.toHaveURL(/.*login/, { timeout: 15000 });
  
  await page.waitForFunction(() => {
    for (let i = 0; i < localStorage.length; i++) {
      if (localStorage.key(i)?.includes('auth-token')) return true;
    }
    return false;
  }, { timeout: 15000 });
  
  await page.waitForTimeout(1000); 
  await page.context().storageState({ path: file });
}

setup('authenticate roles', async ({ page }) => {
  setup.setTimeout(120000); 
  await login(page, 'student', studentAuth);
  await page.context().clearCookies();
  await login(page, 'teacher', teacherAuth);
  await page.context().clearCookies();
  await login(page, 'admin', adminAuth);
});
