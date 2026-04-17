import { test, expect } from '@playwright/test'
import { mockApi, getQaState, PERSONAS } from './fixtures'
import fs from 'node:fs'
import path from 'node:path'

const reportDir = path.join('tests', 'qa', 'reports')
fs.mkdirSync(reportDir, { recursive: true })

interface FlowStep {
  label: string
  path: string
}

const teacherFlow: FlowStep[] = [
  { label: 'dashboard', path: '/#/app/teacher/dashboard' },
  { label: 'courses', path: '/#/app/teacher/courses' },
  { label: 'course-builder', path: '/#/app/teacher/course-builder' },
  { label: 'gradebook', path: '/#/app/teacher/gradebook' },
  { label: 'quiz-manager', path: '/#/app/teacher/quiz-manager' },
  { label: 'quiz-gradebook', path: '/#/app/teacher/quiz-gradebook' },
  { label: 'assignment-gradebook', path: '/#/app/teacher/assignment-gradebook' },
  { label: 'question-bank', path: '/#/app/teacher/question-bank' },
  { label: 'classes', path: '/#/app/teacher/classes' },
  { label: 'analytics', path: '/#/app/teacher/analytics' },
  { label: 'course-analytics', path: '/#/app/teacher/course-analytics' },
  { label: 'dashboards', path: '/#/app/teacher/dashboards' },
  { label: 'creator', path: '/#/app/teacher/creator' },
  { label: 'leaderboard', path: '/#/app/teacher/leaderboard' },
  { label: 'moderation', path: '/#/app/teacher/moderation' },
  { label: 'struggle', path: '/#/app/teacher/struggle' },
  { label: 'lesson-monitor', path: '/#/app/teacher/lesson-monitor' },
  { label: 'scan-attendance', path: '/#/app/teacher/scan-attendance' },
  { label: 'documents', path: '/#/app/teacher/documents' },
  { label: 'adaptive-paths', path: '/#/app/teacher/adaptive-paths' },
  { label: 'profile', path: '/#/profile' },
  { label: 'settings', path: '/#/settings' },
  { label: 'notifications', path: '/#/notifications' },
  { label: 'calendar', path: '/#/calendar' },
  { label: 'announcements', path: '/#/announcements' },
  { label: 'forum', path: '/#/forum' },
  { label: 'directory', path: '/#/directory' },
]

const studentFlow: FlowStep[] = [
  { label: 'dashboard', path: '/#/app/student/dashboard' },
  { label: 'courses', path: '/#/app/student/courses' },
  { label: 'quizzes', path: '/#/app/student/quizzes' },
  { label: 'assignments', path: '/#/app/student/assignments' },
  { label: 'grades', path: '/#/app/student/grades' },
  { label: 'gamification', path: '/#/app/student/gamification' },
  { label: 'leaderboard', path: '/#/app/student/leaderboard' },
  { label: 'certificates', path: '/#/app/student/certificates' },
  { label: 'attendance', path: '/#/app/student/attendance' },
  { label: 'peer-reviews', path: '/#/app/student/peer-reviews' },
  { label: 'profile', path: '/#/profile' },
  { label: 'settings', path: '/#/settings' },
  { label: 'notifications', path: '/#/notifications' },
  { label: 'calendar', path: '/#/calendar' },
  { label: 'announcements', path: '/#/announcements' },
  { label: 'forum', path: '/#/forum' },
]

const adminFlow: FlowStep[] = [
  { label: 'dashboard', path: '/#/app/admin/dashboard' },
  { label: 'users', path: '/#/app/admin/users' },
  { label: 'administration', path: '/#/app/admin/administration' },
  { label: 'audit', path: '/#/app/admin/audit' },
  { label: 'analytics', path: '/#/app/admin/analytics' },
  { label: 'moderation', path: '/#/app/admin/moderation' },
  { label: 'finance', path: '/#/app/admin/finance' },
  { label: 'billing', path: '/#/app/admin/billing' },
  { label: 'system-health', path: '/#/app/admin/system-health' },
  { label: 'feature-flags', path: '/#/app/admin/feature-flags' },
  { label: 'semester', path: '/#/app/admin/semester' },
  { label: 'ppdb', path: '/#/app/admin/ppdb' },
  { label: 'courses', path: '/#/app/admin/courses' },
  { label: 'classes', path: '/#/app/admin/classes' },
  { label: 'gradebook', path: '/#/app/admin/gradebook' },
  { label: 'quiz-manager', path: '/#/app/admin/quiz-manager' },
  { label: 'documents', path: '/#/app/admin/documents' },
  { label: 'creator', path: '/#/app/admin/creator' },
  { label: 'course-analytics', path: '/#/app/admin/course-analytics' },
  { label: 'struggle', path: '/#/app/admin/struggle' },
  { label: 'profile', path: '/#/profile' },
  { label: 'settings', path: '/#/settings' },
  { label: 'notifications', path: '/#/notifications' },
]

async function runPersonaFlow(
  page: import('@playwright/test').Page,
  personaKey: keyof typeof PERSONAS,
  flow: FlowStep[]
) {
  await mockApi(page, personaKey)
  const results: {
    step: string
    path: string
    consoleErrors: string[]
    pageErrors: string[]
    hasMain: boolean
    visibleText: string
    screenshot: string
  }[] = []

  for (const step of flow) {
    // Reset per-step error trackers
    const qa = getQaState(page)
    const beforeConsole = qa.consoleErrors.length
    const beforePage = qa.pageErrors.length

    await page.goto(step.path, { waitUntil: 'domcontentloaded' })
    // Wait for main + network idle so dynamic content mounts
    await page.waitForTimeout(500)
    await page
      .waitForLoadState('networkidle', { timeout: 4_000 })
      .catch(() => undefined)
    await page.waitForTimeout(800)

    const hasMain = await page
      .locator('main#main-content')
      .isVisible()
      .catch(() => false)
    const visibleText = (await page.locator('body').innerText().catch(() => '')).slice(0, 400)

    const screenshotPath = path.join(
      reportDir,
      `${personaKey}-${step.label}.png`
    )
    await page
      .screenshot({ path: screenshotPath, fullPage: true })
      .catch(() => null)

    results.push({
      step: step.label,
      path: step.path,
      consoleErrors: qa.consoleErrors.slice(beforeConsole),
      pageErrors: qa.pageErrors.slice(beforePage),
      hasMain,
      visibleText,
      screenshot: screenshotPath,
    })
  }

  const reportPath = path.join(reportDir, `${personaKey}-report.json`)
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        persona: personaKey,
        totals: {
          steps: results.length,
          stepsWithConsoleErrors: results.filter((r) => r.consoleErrors.length).length,
          stepsWithPageErrors: results.filter((r) => r.pageErrors.length).length,
          stepsEmpty: results.filter((r) => !r.visibleText || r.visibleText.length < 20).length,
        },
        results,
      },
      null,
      2
    )
  )
  return results
}

test.describe('Persona flow QA', () => {
  test.setTimeout(120_000)

  test('teacher key routes', async ({ page }) => {
    const results = await runPersonaFlow(page, 'teacher', teacherFlow)
    const pageErrors = results.flatMap((r) => r.pageErrors)
    expect(pageErrors, 'page-level JS errors').toEqual([])
  })

  test('student key routes', async ({ page }) => {
    const results = await runPersonaFlow(page, 'student', studentFlow)
    const pageErrors = results.flatMap((r) => r.pageErrors)
    expect(pageErrors, 'page-level JS errors').toEqual([])
  })

  test('admin key routes', async ({ page }) => {
    const results = await runPersonaFlow(page, 'admin', adminFlow)
    const pageErrors = results.flatMap((r) => r.pageErrors)
    expect(pageErrors, 'page-level JS errors').toEqual([])
  })
})
