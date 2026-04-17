import { expect, test, devices } from '@playwright/test'
import { mockApi, getQaState } from './fixtures'
import fs from 'node:fs'
import path from 'node:path'

const reportDir = path.join('tests', 'qa', 'reports-mobile')
fs.mkdirSync(reportDir, { recursive: true })

test.use({ ...devices['Pixel 5'] })
test.setTimeout(60_000)

const mobileRoutes = [
  { persona: 'student', label: 'dashboard', path: '/#/app/student/dashboard' },
  { persona: 'student', label: 'courses', path: '/#/app/student/courses' },
  { persona: 'student', label: 'grades', path: '/#/app/student/grades' },
  { persona: 'student', label: 'gamification', path: '/#/app/student/gamification' },
  { persona: 'teacher', label: 'dashboard', path: '/#/app/teacher/dashboard' },
  { persona: 'teacher', label: 'courses', path: '/#/app/teacher/courses' },
  { persona: 'teacher', label: 'creator', path: '/#/app/teacher/creator' },
  { persona: 'admin', label: 'dashboard', path: '/#/app/admin/dashboard' },
  { persona: 'admin', label: 'users', path: '/#/app/admin/users' },
  { persona: 'parent', label: 'dashboard', path: '/#/app/parent' },
] as const

for (const r of mobileRoutes) {
  test(`mobile ${r.persona} ${r.label}`, async ({ page }) => {
    await mockApi(page, r.persona)
    await page.goto(r.path, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)
    const qa = getQaState(page)
    await page.screenshot({
      path: path.join(reportDir, `${r.persona}-${r.label}.png`),
      fullPage: true,
    })
    expect(qa.pageErrors, `page errors on ${r.persona}/${r.label}`).toEqual([])
  })
}
