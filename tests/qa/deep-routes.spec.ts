import { expect, test } from '@playwright/test'
import { mockApi, getQaState } from './fixtures'
import fs from 'node:fs'
import path from 'node:path'

const reportDir = path.join('tests', 'qa', 'reports-deep')
fs.mkdirSync(reportDir, { recursive: true })

test.setTimeout(90_000)

const mockCourseId = '00000000-0000-0000-0000-000000000001'
const mockStudentId = '00000000-0000-0000-0000-000000000002'
const mockClassId = '00000000-0000-0000-0000-000000000003'

const deepRoutes = [
  { persona: 'student', label: 'course-detail', path: `/#/app/student/courses/${mockCourseId}` },
  { persona: 'student', label: 'class-detail', path: `/#/app/student/classes/${mockClassId}` },
  { persona: 'teacher', label: 'student-progress', path: `/#/app/teacher/student-progress/${mockStudentId}` },
  { persona: 'teacher', label: 'preview', path: `/#/app/teacher/preview/${mockCourseId}` },
  { persona: 'teacher', label: 'course-builder-id', path: `/#/app/teacher/course-builder/${mockCourseId}` },
  { persona: 'admin', label: 'student-progress', path: `/#/app/admin/student-progress/${mockStudentId}` },
  { persona: 'admin', label: 'gradebook', path: '/#/app/admin/gradebook' },
  { persona: 'admin', label: 'classes', path: '/#/app/admin/classes' },
] as const

for (const r of deepRoutes) {
  test(`deep ${r.persona} ${r.label}`, async ({ page }) => {
    await mockApi(page, r.persona)
    await page.goto(r.path, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(500)
    await page.waitForLoadState('networkidle', { timeout: 4_000 }).catch(() => undefined)
    await page.waitForTimeout(1000)
    const qa = getQaState(page)
    await page.screenshot({
      path: path.join(reportDir, `${r.persona}-${r.label}.png`),
      fullPage: true,
    })
    expect(qa.pageErrors, `page errors on ${r.persona}/${r.label}`).toEqual([])
    // Don't hard-assert console errors (some deep routes legitimately log when no data)
  })
}
