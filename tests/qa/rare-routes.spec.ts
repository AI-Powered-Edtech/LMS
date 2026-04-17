import { expect, test } from '@playwright/test'
import { mockApi, getQaState } from './fixtures'
import fs from 'node:fs'
import path from 'node:path'

const reportDir = path.join('tests', 'qa', 'reports-rare')
fs.mkdirSync(reportDir, { recursive: true })

test.setTimeout(90_000)

const mockId = '00000000-0000-0000-0000-000000000001'

const rareRoutes = [
  { persona: 'teacher', label: 'plagiarism', path: '/#/app/teacher/plagiarism' },
  { persona: 'teacher', label: 'teaching-hub', path: '/#/app/teacher/teaching-hub' },
  { persona: 'teacher', label: 'grader', path: '/#/app/teacher/grader' },
  { persona: 'teacher', label: 'survey', path: `/#/app/teacher/survey/${mockId}` },
  { persona: 'student', label: 'survey', path: `/#/app/student/survey/${mockId}` },
  { persona: 'admin', label: 'lti', path: '/#/app/admin/lti' },
  { persona: 'admin', label: 'struggle', path: '/#/app/admin/struggle' },
  { persona: 'parent', label: 'laporan', path: '/#/app/parent/laporan' },
  { persona: 'parent', label: 'pengaturan', path: '/#/app/parent/pengaturan' },
  { persona: 'principal', label: 'survey', path: '/#/app/principal/survey' },
  { persona: 'student', label: 'group-assignment', path: '/#/group-assignment' },
  { persona: 'teacher', label: 'announcements', path: '/#/announcements' },
  { persona: 'student', label: 'offline', path: '/#/offline' },
  { persona: 'teacher', label: 'social-hub', path: '/#/social-hub' },
  { persona: 'teacher', label: 'setup-2fa', path: '/#/setup-2fa' },
  { persona: 'student', label: 'data-export', path: '/#/privacy/export-data' },
  { persona: 'student', label: 'delete-account', path: '/#/privacy/delete-account' },
] as const

for (const r of rareRoutes) {
  test(`rare ${r.persona} ${r.label}`, async ({ page }) => {
    await mockApi(page, r.persona)
    await page.goto(r.path, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(500)
    await page.waitForLoadState('networkidle', { timeout: 4_000 }).catch(() => undefined)
    await page.waitForTimeout(800)
    const qa = getQaState(page)
    await page.screenshot({
      path: path.join(reportDir, `${r.persona}-${r.label}.png`),
      fullPage: true,
    })
    expect(qa.pageErrors, `page errors on ${r.persona}/${r.label}`).toEqual([])
  })
}
