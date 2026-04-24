import AxeBuilder from '@axe-core/playwright'
import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Accessibility baseline audit — top-20 screens × axe-core.
 *
 * Pre-req: backend running on :8080, FE on :5173 (no mocks).
 * Logs in as admin (covers the union of FE routes), visits each route,
 * runs axe-core, writes per-route violation report to `.qa-a11y/<route>.json`
 * and a summary at `.qa-a11y/summary.json`.
 *
 * The test FAILS only on critical / serious violations vs a baseline at
 * `.qa-a11y-baseline.json`. New moderate / minor violations are recorded but
 * do not gate (matches the "baseline" framing in Prio 1 Unit 6 — gradual
 * tightening over time, not big-bang).
 */

const ADMIN = { email: 'admin@edusync.dev', password: 'password123' }

const TOP_20_ROUTES = [
  'dashboard',
  'courses',
  'course-builder',
  'gradebook',
  'quiz-manager',
  'question-bank',
  'calendar',
  'assignments',
  'profile',
  'settings',
  'forum',
  'announcements',
  'directory',
  'social-hub',
  'gamification-hub',
  'notifications',
  'analytics',
  'course-analytics',
  'classes',
  'finance',
] as const

const OUTPUT_DIR = path.join(process.cwd(), '.qa-a11y')
const BASELINE_PATH = path.join(process.cwd(), '.qa-a11y-baseline.json')

interface ViolationSummary {
  id: string
  impact: string | null | undefined
  description: string
  nodes: number
}

interface RouteReport {
  route: string
  url: string
  violations: ViolationSummary[]
  passCount: number
  capturedAt: string
}

async function login(page: Page) {
  await page.goto('/')
  await page.getByLabel(/email/i).fill(ADMIN.email)
  await page.getByLabel(/password|kata sandi/i).fill(ADMIN.password)
  await page.getByRole('button', { name: /masuk|login|sign in/i }).click()
  await page.waitForURL(/dashboard|app/, { timeout: 15_000 })
}

function loadBaseline(): Record<string, ViolationSummary[]> {
  if (!fs.existsSync(BASELINE_PATH)) return {}
  try {
    return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')) as Record<string, ViolationSummary[]>
  } catch {
    return {}
  }
}

test.describe('Accessibility baseline (admin persona, top-20 routes)', () => {
  test.beforeAll(() => {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  })

  for (const route of TOP_20_ROUTES) {
    test(`a11y: ${route}`, async ({ page }) => {
      await login(page)
      await page.goto(`/#/${route}`)
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined)

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()

      const violations: ViolationSummary[] = results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.length,
      }))

      const report: RouteReport = {
        route,
        url: page.url(),
        violations,
        passCount: results.passes.length,
        capturedAt: new Date().toISOString(),
      }
      fs.writeFileSync(path.join(OUTPUT_DIR, `${route}.json`), JSON.stringify(report, null, 2))

      const baseline = loadBaseline()[route] ?? []
      const baselineKey = (v: ViolationSummary) => `${v.id}::${v.impact}`
      const baselineSet = new Set(baseline.map(baselineKey))

      const newCriticalOrSerious = violations.filter(
        (v) => (v.impact === 'critical' || v.impact === 'serious') && !baselineSet.has(baselineKey(v))
      )

      expect(
        newCriticalOrSerious,
        `New critical/serious a11y violations on ${route}: ` +
          newCriticalOrSerious.map((v) => `${v.id} (${v.impact}, ${v.nodes} nodes)`).join('; ')
      ).toEqual([])
    })
  }

  test.afterAll(() => {
    const summary = TOP_20_ROUTES.map((route) => {
      const reportPath = path.join(OUTPUT_DIR, `${route}.json`)
      if (!fs.existsSync(reportPath)) return { route, status: 'missing' }
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as RouteReport
      return {
        route,
        violations: report.violations.length,
        critical: report.violations.filter((v) => v.impact === 'critical').length,
        serious: report.violations.filter((v) => v.impact === 'serious').length,
        moderate: report.violations.filter((v) => v.impact === 'moderate').length,
        minor: report.violations.filter((v) => v.impact === 'minor').length,
        passCount: report.passCount,
      }
    })
    fs.writeFileSync(path.join(OUTPUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2))
  })
})
