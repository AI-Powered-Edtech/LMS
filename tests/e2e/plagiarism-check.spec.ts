/**
 * Plagiarism check smoke test — Task G-3 (post-Task-4 follow-up, 2026-05-09).
 *
 * Verifies the FE adapter contract for /api/v1/plagiarism/check after the
 * BE-trim simplified the request to just { submission_id } and the FE button
 * was re-enabled.
 *
 * Coverage:
 *  - plagiarismService.checkPlagiarism file exists.
 *  - Request body sends submission_id only (no content / assignment_id).
 *  - Response adapter normalizes overall_similarity (0..1) → similarity_score (0..100).
 *  - PlagiarismCheckButton has been re-enabled (no disabled stub branch).
 */
import { test, expect } from '@playwright/test'
import { promises as fs } from 'node:fs'
import * as path from 'node:path'

const SERVICE_PATH = 'src/features/plagiarism/api/plagiarismService.ts'
const BUTTON_PATH = 'src/features/plagiarism/components/PlagiarismCheckButton.tsx'

test.describe('Plagiarism check (Task G-3)', () => {
  test('plagiarismService file exists', async () => {
    const abs = path.resolve(process.cwd(), SERVICE_PATH)
    expect((await fs.stat(abs)).isFile()).toBe(true)
  })

  test('request body sends only submission_id (BE-trim)', async () => {
    const abs = path.resolve(process.cwd(), SERVICE_PATH)
    const src = await fs.readFile(abs, 'utf8')
    expect(src).toContain('/api/v1/plagiarism/check')
    expect(src).toMatch(/JSON\.stringify\(\s*\{\s*submission_id:\s*submissionId\s*\}\s*\)/)
    // Must NOT send content / assignment_id from FE anymore
    expect(src).not.toMatch(/JSON\.stringify\([^)]*\bcontent\b[^)]*\)/)
    expect(src).not.toMatch(/JSON\.stringify\([^)]*assignment_id[^)]*\)/)
  })

  test('response adapter normalizes similarity to 0..100', async () => {
    const abs = path.resolve(process.cwd(), SERVICE_PATH)
    const src = await fs.readFile(abs, 'utf8')
    expect(src).toMatch(/Math\.round\([^)]*overall_similarity[^)]*\*\s*100\)/)
    expect(src).toContain("status: 'completed'")
  })

  test('PlagiarismCheckButton is enabled (no stub fallback)', async () => {
    const abs = path.resolve(process.cwd(), BUTTON_PATH)
    const src = await fs.readFile(abs, 'utf8')
    expect(src).toContain('onClick={handleCheck}')
    expect(src).toContain('Periksa Plagiarisme')
    // Must NOT contain the dev-stub copy or disabled-by-default attribute
    expect(src).not.toContain('Periksa Plagiarisme (segera)')
    expect(src).not.toContain('Mesin plagiarisme sedang dikembangkan')
  })
})
