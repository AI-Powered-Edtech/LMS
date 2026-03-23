import { test, expect } from '@playwright/test'

test.describe('Cross-Cutting Checks', () => {
  test('CC-1: Dark Mode Full Sweep', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/#/app/student/dashboard')

    const htmlClass = await page.locator('html').getAttribute('class')
    const bodyClass = await page.locator('body').getAttribute('class')
    expect(
      htmlClass?.includes('dark') ||
        bodyClass?.includes('dark') ||
        htmlClass?.includes('bg-slate-900')
    ).toBeTruthy()
  })

  test('CC-2: Mobile Responsive Sweep (375px)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/#/app/student/dashboard')

    const menuBtn = page
      .locator('button')
      .filter({ has: page.locator('svg') })
      .first()
    await expect(menuBtn).toBeVisible({ timeout: 10000 })
  })

  test('CC-3: Console Error Sweep', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('HMR') && !msg.text().includes('404')) {
        errors.push(msg.text())
      }
    })

    await page.goto('/#/app/student/dashboard')
    await page.waitForTimeout(2000)

    expect(errors.length).toBe(0)
  })

  test('CC-4: Loading & Empty States', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'student', 'Only run for student')

    // Test the assignment empty state specifically since Offline triggers Net Err
    await page.goto('/#/app/student/assignments')
    await expect(page.locator('text=/Tidak ada tugas|Belum ada tugas/i').first()).toBeVisible({
      timeout: 15000,
    })
  })
})
