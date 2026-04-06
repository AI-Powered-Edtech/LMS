import { beforeEach, describe, expect, it, vi } from 'vitest'

// ══════════════════════════════════════════════════════════════
// Supabase Mock
// ══════════════════════════════════════════════════════════════

const mockFrom = vi.fn()
const mockRpc = vi.fn()
const mockGetUser = vi.fn()

function makeChain(resolveWith: { data: unknown; error: unknown }) {
  const chain: Record<string, any> = {}
  const methods = [
    'select', 'insert', 'update', 'upsert', 'delete',
    'eq', 'neq', 'in', 'order', 'limit', 'range',
    'single', 'maybeSingle', 'match',
  ]
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  chain.single.mockResolvedValue(resolveWith)
  chain.maybeSingle.mockResolvedValue(resolveWith)
  chain.then = (resolve: Function) => Promise.resolve(resolveWith).then(resolve)
  return chain
}

vi.mock('@/services/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
    auth: { getUser: () => mockGetUser() },
  },
}))

import {
  addAnnotation,
  deleteAnnotation,
  fetchAnnotations,
  updateAnnotation,
} from '../api/annotationApi'
import {
  fetchGradebookColumns,
  fetchGradebookEntries,
  fetchGradebookSettings,
  syncGradebook,
  updateGradebookEntry,
  upsertGradebookEntry,
  upsertGradebookSettings,
} from '../api/gradebookApi'
import { gradebookService } from '../api/gradebookService'

beforeEach(() => {
  vi.clearAllMocks()
})

// ══════════════════════════════════════════════════════════════
// gradebookApi — fetchGradebookEntries
// ══════════════════════════════════════════════════════════════

describe('fetchGradebookEntries', () => {
  it('queries gradebook_entries with course and tenant isolation', async () => {
    const entries = [
      {
        id: 'ge1', tenant_id: 't1', student_id: 'stu1', course_id: 'c1',
        entity_type: 'quiz', entity_id: 'q1', score: 85, max_score: 100,
        feedback: 'Good', graded_by: null, graded_at: null,
        created_at: '2026-01-01', updated_at: '2026-01-01', title: 'Quiz 1',
        profiles: { full_name: 'Budi', email: 'budi@edu.id' },
      },
    ]
    const chain = makeChain({ data: entries, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await fetchGradebookEntries('c1', 't1')

    expect(mockFrom).toHaveBeenCalledWith('gradebook_entries')
    expect(result).toHaveLength(1)
    expect(result[0].student_name).toBe('Budi')
    expect(result[0].item_type).toBe('quiz')
    expect(result[0].percentage).toBe(85)
  })

  it('calculates percentage correctly — 0 when max_score is 0', async () => {
    const entries = [{
      id: 'ge2', tenant_id: 't1', student_id: 'stu1', course_id: 'c1',
      entity_type: 'assignment', entity_id: 'a1', score: 0, max_score: 0,
      feedback: null, graded_by: null, graded_at: null,
      created_at: '2026-01-01', updated_at: '2026-01-01', title: null,
      profiles: null,
    }]
    mockFrom.mockReturnValue(makeChain({ data: entries, error: null }))
    const result = await fetchGradebookEntries('c1', 't1')
    expect(result[0].percentage).toBe(0)
  })

  it('throws on database error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'DB error' } }))
    await expect(fetchGradebookEntries('c1', 't1')).rejects.toBeDefined()
  })
})

// ══════════════════════════════════════════════════════════════
// gradebookApi — updateGradebookEntry
// ══════════════════════════════════════════════════════════════

describe('updateGradebookEntry', () => {
  it('updates score and maps notes to feedback column', async () => {
    const chain = makeChain({
      data: { id: 'ge1', score: 95, feedback: 'Excellent' },
      error: null,
    })
    mockFrom.mockReturnValue(chain)

    await updateGradebookEntry('ge1', { score: 95, notes: 'Excellent' })

    expect(mockFrom).toHaveBeenCalledWith('gradebook_entries')
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        score: 95,
        feedback: 'Excellent',
      })
    )
  })

  it('throws on update error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'Not found' } }))
    await expect(updateGradebookEntry('ge999', { score: 50 })).rejects.toBeDefined()
  })
})

// ══════════════════════════════════════════════════════════════
// gradebookApi — upsertGradebookEntry
// ══════════════════════════════════════════════════════════════

describe('upsertGradebookEntry', () => {
  it('upserts with entity_type derived from quiz_id', async () => {
    const chain = makeChain({
      data: { id: 'ge-new', entity_type: 'quiz', entity_id: 'q1' },
      error: null,
    })
    mockFrom.mockReturnValue(chain)

    await upsertGradebookEntry({
      tenant_id: 't1', student_id: 'stu1', course_id: 'c1',
      quiz_id: 'q1', assignment_id: null,
      score: 90, max_score: 100, notes: null,
      graded_by: 'teacher-1', graded_at: '2026-01-01',
    } as any)

    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        entity_type: 'quiz',
        entity_id: 'q1',
      }),
      expect.any(Object)
    )
  })
})

// ══════════════════════════════════════════════════════════════
// gradebookApi — syncGradebook
// ══════════════════════════════════════════════════════════════

describe('syncGradebook', () => {
  it('calls sync_gradebook_entries RPC', async () => {
    mockRpc.mockResolvedValue({ data: 12, error: null })
    const count = await syncGradebook('c1', 't1')
    expect(mockRpc).toHaveBeenCalledWith('sync_gradebook_entries', {
      p_course_id: 'c1',
      p_tenant_id: 't1',
    })
    expect(count).toBe(12)
  })

  it('returns 0 when data is null', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })
    const count = await syncGradebook('c1', 't1')
    expect(count).toBe(0)
  })

  it('throws on RPC error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Sync failed' } })
    await expect(syncGradebook('c1', 't1')).rejects.toBeDefined()
  })
})

// ══════════════════════════════════════════════════════════════
// gradebookApi — settings
// ══════════════════════════════════════════════════════════════

describe('fetchGradebookSettings', () => {
  it('returns settings when found', async () => {
    const settings = { id: 's1', grading_scale: 'A-F', weight_quizzes: 60, weight_assignments: 40 }
    mockFrom.mockReturnValue(makeChain({ data: settings, error: null }))
    const result = await fetchGradebookSettings('c1', 't1')
    expect(result).toEqual(settings)
  })

  it('returns null when not configured', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }))
    const result = await fetchGradebookSettings('c1', 't1')
    expect(result).toBeNull()
  })
})

describe('upsertGradebookSettings', () => {
  it('upserts with tenant+course conflict', async () => {
    const settings = { tenant_id: 't1', course_id: 'c1', grading_scale: 'A-F', weight_quizzes: 50, weight_assignments: 50 }
    const chain = makeChain({ data: { id: 's1', ...settings }, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await upsertGradebookSettings(settings as any)
    expect(chain.upsert).toHaveBeenCalledWith(settings, { onConflict: 'tenant_id,course_id' })
  })
})

// ══════════════════════════════════════════════════════════════
// gradebookApi — fetchGradebookColumns
// ══════════════════════════════════════════════════════════════

describe('fetchGradebookColumns', () => {
  it('returns columns from dedicated table', async () => {
    const cols = [
      { id: 'col1', name: 'Quiz 1', type: 'quiz', weight: 1, order: 0, created_at: '2026-01-01' },
    ]
    mockFrom.mockReturnValue(makeChain({ data: cols, error: null }))
    const result = await fetchGradebookColumns('c1', 't1')
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Quiz 1')
  })

  it('throws on error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'Table missing' } }))
    await expect(fetchGradebookColumns('c1', 't1')).rejects.toBeDefined()
  })
})

// ══════════════════════════════════════════════════════════════
// annotationApi
// ══════════════════════════════════════════════════════════════

describe('fetchAnnotations', () => {
  it('queries submission_annotations by submissionId', async () => {
    mockFrom.mockReturnValue(makeChain({ data: [], error: null }))
    const result = await fetchAnnotations('sub-1')
    expect(mockFrom).toHaveBeenCalledWith('submission_annotations')
    expect(result).toEqual([])
  })

  it('throws on error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'RLS denied' } }))
    await expect(fetchAnnotations('sub-1')).rejects.toBeDefined()
  })
})

describe('addAnnotation', () => {
  it('inserts annotation with authenticated user ID', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'teacher-1' } }, error: null })
    const chain = makeChain({
      data: {
        id: 'ann-1', tenant_id: 't1', submission_id: 'sub-1',
        annotator_id: 'teacher-1', x_percent: 50, y_percent: 30,
        content: 'Perhatikan rumus ini', color: '#FFD700',
        created_at: '2026-01-01', updated_at: '2026-01-01',
      },
      error: null,
    })
    mockFrom.mockReturnValue(chain)

    const result = await addAnnotation({
      submission_id: 'sub-1',
      x_percent: 50,
      y_percent: 30,
      content: 'Perhatikan rumus ini',
    })

    expect(result.annotator_id).toBe('teacher-1')
    expect(result.color).toBe('#FFD700') // default color
  })

  it('throws when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No user' } })
    await expect(
      addAnnotation({ submission_id: 's1', x_percent: 0, y_percent: 0, content: 'x' })
    ).rejects.toThrow('Pengguna tidak terautentikasi')
  })
})

describe('updateAnnotation', () => {
  it('updates content by annotation ID', async () => {
    const chain = makeChain({
      data: { id: 'ann-1', content: 'Updated' },
      error: null,
    })
    mockFrom.mockReturnValue(chain)
    await updateAnnotation('ann-1', 'Updated')
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'Updated' })
    )
  })
})

describe('deleteAnnotation', () => {
  it('deletes by ID', async () => {
    const chain = makeChain({ data: null, error: null })
    // Override so delete chain resolves without .single()
    chain.eq = vi.fn().mockResolvedValue({ error: null })
    chain.delete = vi.fn().mockReturnValue(chain)
    mockFrom.mockReturnValue(chain)
    await deleteAnnotation('ann-1')
    expect(mockFrom).toHaveBeenCalledWith('submission_annotations')
  })
})

// ══════════════════════════════════════════════════════════════
// gradebookService (simple service)
// ══════════════════════════════════════════════════════════════

describe('gradebookService.getStudentGrades', () => {
  it('queries assignment_submissions with student and tenant', async () => {
    const data = [
      { id: 's1', score: 90, status: 'graded', submitted_at: '2026-01-01', assignments: { id: 'a1', title: 'HW1', max_points: 100, classes: { name: 'IPA' } } },
    ]
    mockFrom.mockReturnValue(makeChain({ data, error: null }))
    const result = await gradebookService.getStudentGrades('stu1', 't1')
    expect(mockFrom).toHaveBeenCalledWith('assignment_submissions')
    expect(result).toHaveLength(1)
  })

  it('returns empty array when no submissions', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }))
    const result = await gradebookService.getStudentGrades('stu1', 't1')
    expect(result).toEqual([])
  })

  it('throws on database error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'Error' } }))
    await expect(gradebookService.getStudentGrades('stu1', 't1')).rejects.toBeDefined()
  })
})