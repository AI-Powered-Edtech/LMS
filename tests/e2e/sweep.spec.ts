import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

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
  // Original 3 personas (edusync.dev tenant) — kept for backward compatibility
  // with the baseline sweep until SMA Nusantara Dev becomes the canonical tenant.
  admin: { email: 'admin@edusync.dev', password: 'password123' },
  teacher: { email: 'teacher@edusync.dev', password: 'password123' },
  student: { email: 'student@edusync.dev', password: 'password123' },

  // Fase 0.5 personas (SMA Nusantara Dev tenant). Seeded by
  // edusync-api/schema/dev_seed.sql; full account list in
  // docs/dev-school-accounts.md.
  wali_kelas: { email: 'wali.x-ipa-1@nusantara.dev', password: 'password123' },
  wakasek_kurikulum: { email: 'wakasek.kurikulum@nusantara.dev', password: 'password123' },
  principal: { email: 'kepsek@nusantara.dev', password: 'password123' },
  guru_bk: { email: 'bk@nusantara.dev', password: 'password123' },
  tu: { email: 'tu@nusantara.dev', password: 'password123' },
  parent_specific_child: { email: 'ortu001@nusantara.dev', password: 'password123' },
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
  'academic-years',
  'rombel',
  'subjects',
  'timetable',
  'rapor',
  'bos',
  'ppdb-jalur',
  'p5',
  'integrations',
  'insights',
  'akm-stimuli',
  'bank-va',
  'parent-links',
  'search',
  'struggle',
  'lti',
  'adaptive-paths',
  'plagiarism',
]

const TEACHER_ROUTES = [
  'dashboard',
  'teaching-hub',
  'counseling',
  'rombel-attendance',
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

// Routes the new Fase 0.5 personas should exercise. These are intentionally
// modest subsets of TEACHER_ROUTES / ADMIN_ROUTES — every persona's privilege
// scope is a Fase 1 RBAC concern; for now the sweep just confirms the routes
// load without console errors when accessed by these personas.
const WALI_KELAS_ROUTES = [
  'dashboard',
  'teaching-hub',
  'classes',
  'gradebook',
  'attendance',
  'announcements',
]

const WAKASEK_ROUTES = [
  'dashboard',
  'analytics',
  'course-analytics',
  'classes',
  'semester',
  'announcements',
]

const PRINCIPAL_ROUTES = [
  'dashboard',
  'analytics',
  'finance',
  'system-health',
  'announcements',
  'reviews/pending',
]

const GURU_BK_ROUTES = [
  'dashboard',
  'directory',
  'announcements',
  'forum',
  'notifications',
]

const TU_ROUTES = [
  'dashboard',
  'users',
  'billing',
  'finance',
  'ppdb',
  'administration',
  'documents',
]

const PARENT_ROUTES = [
  'dashboard',
  'announcements',
  'notifications',
  'calendar',
  'profile',
]

const PERSONA_ROUTES: Record<Persona, string[]> = {
  admin: [...ADMIN_ROUTES.map((r) => `admin/${r}`), ...SHARED_ROUTES.map((r) => `${r}`)],
  teacher: [...TEACHER_ROUTES.map((r) => `teacher/${r}`), ...SHARED_ROUTES.map((r) => `${r}`)],
  student: [...STUDENT_ROUTES.map((r) => `student/${r}`), ...SHARED_ROUTES.map((r) => `${r}`)],
  wali_kelas: [...WALI_KELAS_ROUTES.map((r) => `teacher/${r}`), ...SHARED_ROUTES],
  wakasek_kurikulum: [...WAKASEK_ROUTES.map((r) => `admin/${r}`), ...SHARED_ROUTES],
  principal: [...PRINCIPAL_ROUTES.map((r) => `admin/${r}`), ...SHARED_ROUTES],
  guru_bk: [...GURU_BK_ROUTES.map((r) => `teacher/${r}`), ...SHARED_ROUTES],
  tu: [...TU_ROUTES.map((r) => `admin/${r}`), ...SHARED_ROUTES],
  parent_specific_child: [...PARENT_ROUTES, ...SHARED_ROUTES],
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
