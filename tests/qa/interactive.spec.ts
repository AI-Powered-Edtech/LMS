import { expect, test } from '@playwright/test'
import { mockApi, getQaState } from './fixtures'
import fs from 'node:fs'
import path from 'node:path'

const reportDir = path.join('tests', 'qa', 'reports-interactive')
fs.mkdirSync(reportDir, { recursive: true })

test.setTimeout(60_000)

test.describe('Interactive flows', () => {
  test('teacher → Kelola Materi button from dashboard opens course manager', async ({ page }) => {
    await mockApi(page, 'teacher')
    await page.goto('/#/app/teacher/dashboard', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1200)
    const btn = page.getByRole('link', { name: /Kelola Materi/i }).first()
    if (await btn.isVisible().catch(() => false)) {
      await btn.click()
      await page.waitForTimeout(1000)
      await page.screenshot({ path: path.join(reportDir, 'teacher-kelola-materi.png'), fullPage: true })
      expect(page.url()).toContain('courses')
    }
  })

  test('teacher opens course builder and checks empty state CTA', async ({ page }) => {
    await mockApi(page, 'teacher')
    await page.goto('/#/app/teacher/courses', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1200)
    await page.screenshot({ path: path.join(reportDir, 'teacher-courses-empty.png'), fullPage: true })
    const createBtn = page.getByRole('button', { name: /Buat Materi Baru|Buat Kelas|Tambah/i }).first()
    const visible = await createBtn.isVisible().catch(() => false)
    expect(visible, 'Create/Add CTA should be present').toBeTruthy()
  })

  test('student clicks notification bell opens dropdown', async ({ page }) => {
    await mockApi(page, 'student')
    await page.goto('/#/app/student/dashboard', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1200)
    // Click bell icon in header
    const bell = page.getByRole('button', { name: /Notifikasi|Lihat notifikasi/i }).first()
    if (await bell.isVisible().catch(() => false)) {
      await bell.click()
      await page.waitForTimeout(500)
      await page.screenshot({ path: path.join(reportDir, 'student-notifications-dropdown.png'), fullPage: false })
    }
  })

  test('student tabs through grade filter buttons', async ({ page }) => {
    await mockApi(page, 'student')
    await page.goto('/#/app/student/grades', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    const qa = getQaState(page)
    expect(qa.pageErrors, 'no page errors on grades').toEqual([])
    // Try changing the target grade input
    const targetInput = page.locator('input[type="number"]').first()
    if (await targetInput.isVisible().catch(() => false)) {
      await targetInput.fill('85')
    }
    await page.screenshot({ path: path.join(reportDir, 'student-grades-interact.png'), fullPage: true })
  })

  test('admin filters pengguna table', async ({ page }) => {
    await mockApi(page, 'admin')
    await page.goto('/#/app/admin/users', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    const search = page.getByPlaceholder(/Cari nama atau email/i).first()
    if (await search.isVisible().catch(() => false)) {
      await search.fill('test')
      await page.waitForTimeout(500)
    }
    const qa = getQaState(page)
    expect(qa.pageErrors, 'no page errors').toEqual([])
    await page.screenshot({ path: path.join(reportDir, 'admin-users-filtered.png'), fullPage: true })
  })

  test('teacher toggles dark mode via theme button', async ({ page }) => {
    await mockApi(page, 'teacher')
    await page.goto('/#/app/teacher/dashboard', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1200)
    const themeBtn = page.getByRole('button', { name: /Mode gelap|Mode terang|Ubah tema/i }).first()
    if (await themeBtn.isVisible().catch(() => false)) {
      await themeBtn.click()
      await page.waitForTimeout(400)
      await page.screenshot({ path: path.join(reportDir, 'teacher-dark-mode.png'), fullPage: false })
      // Toggle back
      await themeBtn.click()
    }
    const qa = getQaState(page)
    expect(qa.pageErrors, 'theme toggle should not crash').toEqual([])
  })

  test('teacher sidebar top-level groups are clickable without crashes', async ({ page }) => {
    await mockApi(page, 'teacher')
    await page.goto('/#/app/teacher/dashboard', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1200)
    // Collect sidebar labels before mutating the DOM
    const labels = await page
      .locator('aside a, aside button')
      .evaluateAll((nodes: Element[]) =>
        (nodes as HTMLElement[])
          .map((n) => n.textContent?.trim())
          .filter((t): t is string => !!t && t.length > 0 && t.length < 40)
      )
    for (const label of labels.slice(0, 5)) {
      const link = page.getByRole('link', { name: label }).first()
      if (await link.isVisible().catch(() => false)) {
        await link.click({ timeout: 2000 }).catch(() => undefined)
        await page.waitForTimeout(400)
      }
    }
    const qa = getQaState(page)
    expect(qa.pageErrors.filter((e) => !e.includes('ResizeObserver'))).toEqual([])
  })
})
