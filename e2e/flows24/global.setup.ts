import { test as setup, expect } from '@playwright/test'
import * as fs from 'fs'

const studentAuth = 'e2e/.auth/student.json'
const teacherAuth = 'e2e/.auth/teacher.json'
const adminAuth = 'e2e/.auth/admin.json'

async function login(page: any, role: string, file: string) {
  if (fs.existsSync(file)) return

  // Navigate to the app first so we have a valid origin for localStorage
  await page.goto('/#/login')
  await page.waitForTimeout(500)

  // Clear all storage to ensure fresh login (prevents redirect from cached session)
  await page.evaluate(() => {
    try {
      localStorage.clear()
    } catch (_e) {
      /* ignore */
    }
    try {
      sessionStorage.clear()
    } catch (_e) {
      /* ignore */
    }
  })
  await page.context().clearCookies()

  // Re-navigate to login after clearing
  await page.goto('/#/login')
  await page.waitForTimeout(1000)

  // If we got redirected away from login, force clear and retry
  if (!page.url().includes('login')) {
    await page.evaluate(() => {
      try {
        localStorage.clear()
      } catch (_e) {
        /* ignore */
      }
      try {
        sessionStorage.clear()
      } catch (_e) {
        /* ignore */
      }
    })
    await page.context().clearCookies()
    await page.goto('/#/login')
    await page.waitForTimeout(2000)
  }

  await page.locator('input[name="email"]').waitFor({ state: 'visible', timeout: 20000 })

  // Use page.fill() — keyboard.type() doesn't reliably trigger React controlled inputs
  await page.fill('input[type="email"], input[name="email"]', `${role}@edusync.dev`)
  await page.fill('input[type="password"], input[name="password"]', 'password123')

  await page.locator('button[type="submit"]').click()

  await expect(page).not.toHaveURL(/.*login/, { timeout: 30000 })

  await page.waitForFunction(
    () => {
      for (let i = 0; i < localStorage.length; i++) {
        if (localStorage.key(i)?.includes('auth-token')) return true
      }
      return false
    },
    { timeout: 30000 }
  )

  await page.waitForTimeout(1500)
  await page.context().storageState({ path: file })
}

setup('authenticate roles', async ({ page }) => {
  setup.setTimeout(180000)
  await login(page, 'student', studentAuth)
  await page.context().clearCookies()
  await login(page, 'teacher', teacherAuth)
  await page.context().clearCookies()
  await login(page, 'admin', adminAuth)
})
