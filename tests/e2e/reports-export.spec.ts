/**
 * Reports export smoke test — Task G-3 (post-Task-4 follow-up, 2026-05-09).
 *
 * Verifies the gradebook export wiring after FeatureFlagBanner removal.
 *
 * Coverage:
 *  - useExportReport hook exists and posts to /api/v1/reports/export.
 *  - detectStubResponse stub guard is still wired (defense vs BE regressions).
 *  - GradebookExportActions no longer renders the FeatureFlagBanner.
 *  - FeatureFlagBanner.tsx has been deleted (no other refs).
 */
import { test, expect } from '@playwright/test'
import { promises as fs } from 'node:fs'
import * as path from 'node:path'

const HOOK_PATH = 'src/features/gradebook/hooks/useExportReport.ts'
const ACTIONS_PATH = 'src/features/gradebook/components/GradebookExportActions.tsx'
const BANNER_PATH = 'src/components/FeatureFlagBanner.tsx'

test.describe('Reports export (Task G-3)', () => {
  test('useExportReport hook exists', async () => {
    const abs = path.resolve(process.cwd(), HOOK_PATH)
    expect((await fs.stat(abs)).isFile()).toBe(true)
  })

  test('hook posts to /api/v1/reports/export', async () => {
    const abs = path.resolve(process.cwd(), HOOK_PATH)
    const src = await fs.readFile(abs, 'utf8')
    expect(src).toContain('/api/v1/reports/export')
    expect(src).toMatch(/method:\s*'POST'/)
  })

  test('hook guards against stub responses', async () => {
    const abs = path.resolve(process.cwd(), HOOK_PATH)
    const src = await fs.readFile(abs, 'utf8')
    expect(src).toContain('detectStubResponse')
  })

  test('GradebookExportActions no longer renders FeatureFlagBanner', async () => {
    const abs = path.resolve(process.cwd(), ACTIONS_PATH)
    const src = await fs.readFile(abs, 'utf8')
    expect(src).not.toContain('FeatureFlagBanner')
    expect(src).not.toContain('feature="reports.export"')
  })

  test('FeatureFlagBanner.tsx has been deleted', async () => {
    const abs = path.resolve(process.cwd(), BANNER_PATH)
    let exists = true
    try {
      await fs.stat(abs)
    } catch {
      exists = false
    }
    expect(exists).toBe(false)
  })
})
