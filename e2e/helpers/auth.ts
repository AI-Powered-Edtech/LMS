import type { Page } from '@playwright/test'
import { test } from '@playwright/test'

const CREDENTIALS = {
  student: {
    email: process.env.E2E_STUDENT_EMAIL ?? 'student@edusync.dev',
    password: process.env.E2E_STUDENT_PASSWORD ?? 'password123',
  },
  teacher: {
    email: process.env.E2E_TEACHER_EMAIL ?? 'teacher@edusync.dev',
    password: process.env.E2E_TEACHER_PASSWORD ?? 'password123',
  },
  admin: {
    email: process.env.E2E_ADMIN_EMAIL ?? 'admin@edusync.dev',
    password: process.env.E2E_ADMIN_PASSWORD ?? 'password123',
  },
}

type Role = keyof typeof CREDENTIALS

/**
 * Login helper yang menangani dua skenario:
 * 1. Login page dev mode: ada quick-login button (data-testid atau text)
 * 2. Login page normal: form email + password
 */
async function loginAs(page: Page, role: Role): Promise<void> {
  await page.goto('/#/login')
  await page.waitForLoadState('networkidle')

  // Coba quick-login button dulu (dev mode)
  const quickSel = `[data-testid="quick-login-${role}"], button:has-text("${role.charAt(0).toUpperCase() + role.slice(1)}")`
  const quickBtn = page.locator(quickSel).first()
  const hasQuick = await quickBtn.isVisible({ timeout: 2000 }).catch(() => false)

  if (hasQuick) {
    await quickBtn.click()
  } else {
    const { email, password } = CREDENTIALS[role]
    await page.fill('input[type="email"], input[name="email"]', email)
    await page.fill('input[type="password"], input[name="password"]', password)
    await page.click('button[type="submit"]')
  }

  // Tunggu redirect keluar dari login
  await page.waitForURL(/dashboard|student|teacher|admin/, { timeout: 12000 })
}

export async function loginAsStudent(page: Page): Promise<void> {
  await loginAs(page, 'student')
}

export async function loginAsTeacher(page: Page): Promise<void> {
  await loginAs(page, 'teacher')
}

export async function loginAsAdmin(page: Page): Promise<void> {
  await loginAs(page, 'admin')
}

/**
 * Navigasi ke halaman dan tunggu sampai tidak ada spinner/loading state.
 * Berguna setelah login untuk memastikan data sudah dimuat.
 */
export async function gotoAndWait(page: Page, path: string): Promise<void> {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  // Tunggu loading spinner hilang jika ada
  await page
    .locator('[data-testid="loading"], .animate-spin')
    .waitFor({
      state: 'hidden',
      timeout: 8000,
    })
    .catch(() => {
      /* ok jika tidak ada spinner */
    })
}

/**
 * Dismiss alert/toast jika muncul agar tidak memblokir interaksi.
 */
export async function dismissToast(page: Page): Promise<void> {
  const toast = page.locator('[role="alert"], [data-testid="toast"]').first()
  const visible = await toast.isVisible({ timeout: 1000 }).catch(() => false)
  if (visible) {
    const closeBtn = toast.locator('button[aria-label="close"], button[aria-label="tutup"]')
    if (await closeBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await closeBtn.click()
    }
  }
}

// Jika tidak ada Supabase credentials, skip authenticated tests gracefully
const hasSupabaseConfig = !!(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY)

export function skipIfNoAuth(): void {
  if (!hasSupabaseConfig) {
    test.skip(true, 'Supabase credentials tidak dikonfigurasi — skip authenticated test')
  }
}
