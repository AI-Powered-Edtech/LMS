import { test, expect } from '@playwright/test'
import { mockApi, getQaState } from './fixtures'
import fs from 'node:fs'
import path from 'node:path'

const reportDir = path.join('tests', 'qa', 'reports')
fs.mkdirSync(reportDir, { recursive: true })

interface FlowStep {
  label: string
  path: string
}

const parentFlow: FlowStep[] = [
  { label: 'dashboard', path: '/#/app/parent' },
  { label: 'nilai', path: '/#/app/parent/nilai' },
  { label: 'kehadiran', path: '/#/app/parent/kehadiran' },
  { label: 'pesan', path: '/#/app/parent/pesan' },
  { label: 'pengaturan', path: '/#/app/parent/pengaturan' },
  { label: 'laporan', path: '/#/app/parent/laporan' },
  { label: 'notifications', path: '/#/notifications' },
  { label: 'profile', path: '/#/profile' },
]

const principalFlow: FlowStep[] = [
  { label: 'dashboard', path: '/#/app/principal' },
  { label: 'settings', path: '/#/app/principal/settings' },
  { label: 'report', path: '/#/app/principal/report' },
  { label: 'analytics', path: '/#/app/principal/analytics' },
  { label: 'profile', path: '/#/profile' },
  { label: 'notifications', path: '/#/notifications' },
]

test.setTimeout(90_000)

async function walkFlow(
  page: import('@playwright/test').Page,
  persona: 'parent' | 'principal',
  flow: FlowStep[]
) {
  await mockApi(page, persona)
  const results: {
    step: string
    consoleErrors: string[]
    pageErrors: string[]
    visibleText: string
  }[] = []
  for (const step of flow) {
    const qa = getQaState(page)
    const c0 = qa.consoleErrors.length
    const p0 = qa.pageErrors.length
    await page.goto(step.path, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(500)
    await page.waitForLoadState('networkidle', { timeout: 4_000 }).catch(() => undefined)
    await page.waitForTimeout(800)
    const text = (await page.locator('body').innerText().catch(() => '')).slice(0, 400)
    await page
      .screenshot({ path: path.join(reportDir, `${persona}-${step.label}.png`), fullPage: true })
      .catch(() => null)
    results.push({
      step: step.label,
      consoleErrors: qa.consoleErrors.slice(c0),
      pageErrors: qa.pageErrors.slice(p0),
      visibleText: text,
    })
  }
  fs.writeFileSync(
    path.join(reportDir, `${persona}-report.json`),
    JSON.stringify({ persona, results }, null, 2)
  )
  return results
}

test('parent key routes', async ({ page }) => {
  const results = await walkFlow(page, 'parent', parentFlow)
  expect(results.flatMap((r) => r.pageErrors)).toEqual([])
})

test('principal key routes', async ({ page }) => {
  const results = await walkFlow(page, 'principal', principalFlow)
  expect(results.flatMap((r) => r.pageErrors)).toEqual([])
})
