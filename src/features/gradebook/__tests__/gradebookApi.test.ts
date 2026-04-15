import { beforeEach, describe, expect, it, vi } from 'vitest'

// ── DB Mock ─────────────────────────────────────────────────────────────────
const { mockFrom } = vi.hoisted(() => {
  const mockFrom = vi.fn()
  return { mockFrom }
})

vi.mock('@/services/db', () => ({
  db: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import { addGradebookItem } from '../api/gradebookApi'

// ── Helpers ────────────────────────────────────────────────────────────────

function makeChain(resolveWith: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  const methods = [
    'insert',
    'select',
    'single',
    'eq',
    'update',
    'upsert',
    'order',
    'limit',
    'maybeSingle',
  ]
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  ;(chain.single as ReturnType<typeof vi.fn>).mockResolvedValue(resolveWith)
  ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue(resolveWith)
  chain.then = (resolve: (v: unknown) => unknown, reject: (v: unknown) => unknown) =>
    Promise.resolve(resolveWith).then(resolve, reject)
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── addGradebookItem ───────────────────────────────────────────────────────

describe('addGradebookItem', () => {
  const COLUMN_DEFINITION_SENTINEL = '00000000-0000-0000-0000-000000000001'

  it('inserts with sentinel student_id (not caller user ID)', async () => {
    const chain = makeChain({
      data: { id: 'entry-1', entity_type: 'assignment', entity_id: 'uuid-xyz', max_score: 100 },
      error: null,
    })
    mockFrom.mockReturnValue(chain)

    await addGradebookItem({
      courseId: 'course-1',
      tenantId: 'tenant-1',
      title: 'UTS Bahasa Indonesia',
      entityType: 'assignment',
      maxScore: 100,
    })

    // Verify the insert was called with the sentinel UUID — never a real user ID
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        student_id: COLUMN_DEFINITION_SENTINEL,
        course_id: 'course-1',
        tenant_id: 'tenant-1',
        entity_type: 'assignment',
        max_score: 100,
      })
    )
  })

  it('returns the new entity ID and title', async () => {
    const chain = makeChain({
      data: { id: 'entry-1', entity_type: 'quiz', entity_id: 'uuid-xyz', max_score: 50 },
      error: null,
    })
    mockFrom.mockReturnValue(chain)

    const result = await addGradebookItem({
      courseId: 'course-1',
      tenantId: 'tenant-1',
      title: 'Kuis Matematika',
      entityType: 'quiz',
      maxScore: 50,
    })

    expect(result.title).toBe('Kuis Matematika')
    expect(result.maxScore).toBe(50)
    expect(result.entityType).toBe('quiz')
    // id should be the new entity UUID (not the gradebook entry id)
    expect(typeof result.id).toBe('string')
    expect(result.id).toHaveLength(36) // UUID format
  })

  it('throws when insert fails', async () => {
    const chain = makeChain({ data: null, error: { message: 'FK violation' } })
    // single() should reject on error
    ;(chain.single as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: { message: 'FK violation' },
    })
    mockFrom.mockReturnValue(chain)

    await expect(
      addGradebookItem({
        courseId: 'course-1',
        tenantId: 'tenant-1',
        title: 'Test',
        entityType: 'manual',
        maxScore: 10,
      })
    ).rejects.toEqual({ message: 'FK violation' })
  })
})
