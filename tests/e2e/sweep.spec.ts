import { test, expect, type Page } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'

/**
 * Real-backend screen sweep.
 *
 * Pre-req: backend running on :8080 (user manages), frontend on :5173
 * (auto-started by playwright.config webServer). No mocks.
 *
 * Logs in via UI for each persona, visits every static route, captures
 * console errors / pageerror / failed requests / screenshot. Writes
 * `.qa-sweep/<persona>/report.json` + PNGs.
 */

const CREDENTIALS = {
  admin: { email: 'admin@edusync.dev', password: 'password123' },
  teacher: { email: 'teacher@edusync.dev', password: 'password123' },
  student: { email: 'student@edusync.dev', password: 'password123' },
  admin_nusantara: { email: 'admin@nusantara.dev', password: 'password123' },
  principal_nusantara: { email: 'kepsek@nusantara.dev', password: 'password123' },
  teacher1_nusantara: { email: 'guru1@nusantara.dev', password: 'password123' },
  teacher2_nusantara: { email: 'guru2@nusantara.dev', password: 'password123' },
  student1_nusantara: { email: 'siswa1@nusantara.dev', password: 'password123' },
  student2_nusantara: { email: 'siswa2@nusantara.dev', password: 'password123' },
} as const

type Persona = keyof typeof CREDENTIALS

const SHARED_ROUTES = [
  'forum',
  'profile',
  'settings',
  'calendar',
  'announcements',
  'assignments',
  'directory',
  'social-hub',
  'gamification-hub',
  'notifications',
]

const ADMIN_ROUTES = [
  'dashboard',
  'users',
  'billing',
  'moderation',
  'reviews/pending',
  'finance',
  'ppdb',
  'administration',
  'audit',
  'analytics',
  'course-analytics',
  'documents',
  'creator',
  'courses',
  'course-builder',
  'quiz-manager',
  'question-bank',
  'gradebook',
  'quiz-gradebook',
  'assignment-gradebook',
  'grader',
  'classes',
  'scan-attendance',
  'system-health',
  'feature-flags',
  'semester',
  'struggle',
  'lti',
  'adaptive-paths',
  'plagiarism',
]

const TEACHER_ROUTES = [
  'dashboard',
  'teaching-hub',
  'courses',
  'course-builder',
  'quiz-manager',
  'question-bank',
  'quiz-gradebook',
  'assignment-gradebook',
  'grader',
  'course-analytics',
  'classes',
  'analytics',
  'lesson-monitor',
  'scan-attendance',
  'documents',
  'creator',
  'leaderboard',
  'struggle',
  'adaptive-paths',
  'plagiarism',
]

const STUDENT_ROUTES = [
  'dashboard',
  'courses',
  'quizzes',
  'assignments',
  'certificates',
  'grades',
  'attendance',
  'gamification',
  'leaderboard',
  'peer-reviews',
]

const PERSONA_ROUTES: Record<Persona, string[]> = {
  admin: [...ADMIN_ROUTES.map((r) => `admin/${r}`), ...SHARED_ROUTES.map((r) => `${r}`)],
  teacher: [...TEACHER_ROUTES.map((r) => `teacher/${r}`), ...SHARED_ROUTES.map((r) => `${r}`)],
  student: [...STUDENT_ROUTES.map((r) => `student/${r}`), ...SHARED_ROUTES.map((r) => `${r}`)],
  admin_nusantara: [...ADMIN_ROUTES.map((r) => `admin/${r}`), ...SHARED_ROUTES.map((r) => `${r}`)],
  principal_nusantara: [...ADMIN_ROUTES.map((r) => `admin/${r}`), ...SHARED_ROUTES.map((r) => `${r}`)],
  teacher1_nusantara: [...TEACHER_ROUTES.map((r) => `teacher/${r}`), ...SHARED_ROUTES.map((r) => `${r}`)],
  teacher2_nusantara: [...TEACHER_ROUTES.map((r) => `teacher/${r}`), ...SHARED_ROUTES.map((r) => `${r}`)],
  student1_nusantara: [...STUDENT_ROUTES.map((r) => `student/${r}`), ...SHARED_ROUTES.map((r) => `${r}`)],
  student2_nusantara: [...STUDENT_ROUTES.map((r) => `student/${r}`), ...SHARED_ROUTES.map((r) => `${r}`)],
}

interface RouteResult {
  route: string
  url: string
  consoleErrors: string[]
  pageErrors: string[]
  failedRequests: string[]
  screenshot: string
}

function attachErrorCapture(page: Page) {
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  const failedRequests: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const t = msg.text()
      // Filter useless "Failed to load resource" (status already captured via response)
      if (t.startsWith('Failed to load resource')) return
      consoleErrors.push(t)
    }
  })
  page.on('pageerror', (err) => pageErrors.push(String(err.message || err)))
  page.on('requestfailed', (req) => {
    const f = req.failure()
    if (f && /ERR_ABORTED|net::ERR_FAILED/.test(f.errorText)) return
    failedRequests.push(`${req.method()} ${req.url()} — ${f?.errorText || ''}`)
  })
  page.on('response', async (resp) => {
    const s = resp.status()
    if (s < 400) return
    const req = resp.request()
    let body = ''
    try {
      const b = req.postData()
      if (b) body = ` body=${b.slice(0, 400)}`
    } catch {}
    let respBody = ''
    try {
      const t = await resp.text()
      if (t) respBody = ` resp=${t.slice(0, 300)}`
    } catch {}
    failedRequests.push(`HTTP ${s} ${req.method()} ${resp.url()}${body}${respBody}`)
  })
  return { consoleErrors, pageErrors, failedRequests }
}

async function login(page: Page, persona: Persona) {
  const creds = CREDENTIALS[persona]
  await page.goto('/#/login')
  await page.getByTestId('login-email-input').fill(creds.email)
  await page.getByTestId('login-password-input').fill(creds.password)
  await page.getByTestId('login-submit-button').click()
  // HashRouter: wait for hash to leave /login
  await page.waitForFunction(() => !location.hash.startsWith('#/login') && location.hash !== '', {
    timeout: 30_000,
  })
}

for (const persona of Object.keys(CREDENTIALS) as Persona[]) {
  test(`sweep ${persona}`, async ({ page }) => {
    test.setTimeout(10 * 60_000)
    const outDir = path.resolve('.qa-sweep', persona)
    fs.mkdirSync(outDir, { recursive: true })

    // Login (errors during login NOT attached to any route, but logged)
    const loginCapture = attachErrorCapture(page)
    await login(page, persona)

    const results: RouteResult[] = []
    results.push({
      route: '__login__',
      url: page.url(),
      consoleErrors: [...loginCapture.consoleErrors],
      pageErrors: [...loginCapture.pageErrors],
      failedRequests: [...loginCapture.failedRequests],
      screenshot: '',
    })
    // Reset capture buffers for per-route isolation
    loginCapture.consoleErrors.length = 0
    loginCapture.pageErrors.length = 0
    loginCapture.failedRequests.length = 0

    for (const route of PERSONA_ROUTES[persona]) {
      loginCapture.consoleErrors.length = 0
      loginCapture.pageErrors.length = 0
      loginCapture.failedRequests.length = 0

      const target = `/#/app/${route}`
      try {
        await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 30_000 })
      } catch (err) {
        results.push({
          route,
          url: target,
          consoleErrors: [`NAVIGATE_THREW: ${String(err)}`],
          pageErrors: [],
          failedRequests: [],
          screenshot: '',
        })
        continue
      }
      // Let lazy chunks + queries settle
      await page.waitForTimeout(2500)

      const shotName = `${route.replace(/\//g, '_')}.png`
      const shotPath = path.join(outDir, shotName)
      try {
        await page.screenshot({ path: shotPath, fullPage: false })
      } catch {
        /* ignore */
      }

      results.push({
        route,
        url: page.url(),
        consoleErrors: [...loginCapture.consoleErrors],
        pageErrors: [...loginCapture.pageErrors],
        failedRequests: [...loginCapture.failedRequests],
        screenshot: shotName,
      })
    }

    fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(results, null, 2))

    // Summary: don't fail the test on errors — this is a capture run.
    const totalErr = results.reduce(
      (n, r) => n + r.consoleErrors.length + r.pageErrors.length + r.failedRequests.length,
      0,
    )
    console.log(`[sweep ${persona}] ${results.length} routes, ${totalErr} issues → ${outDir}`)
    expect(results.length).toBeGreaterThan(0)
  })
}
