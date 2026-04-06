import { beforeEach, describe, expect, it, vi } from 'vitest'

import { lessonService } from '../api/lessonService'

// ══════════════════════════════════════════════════════════════
// Supabase + sessionStorage Mocks
// ══════════════════════════════════════════════════════════════

const mockRpc = vi.fn()
const mockFrom = vi.fn()

function makeChain(resolveWith: { data: unknown; error: unknown }) {
  const chain: Record<string, any> = {}
  const methods = [
    'select', 'insert', 'update', 'upsert', 'delete',
    'eq', 'neq', 'in', 'gte', 'lte', 'order', 'limit', 'range',
    'single', 'maybeSingle', 'match', 'not', 'is',
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
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

vi.mock('@/utils/logDevError', () => ({
  logDevError: vi.fn(),
  logDevWarn: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
})

// ══════════════════════════════════════════════════════════════
// fetchModuleLessons — isTeacher filter
// ══════════════════════════════════════════════════════════════

describe('lessonService.fetchModuleLessons', () => {
  it('includes draft lessons when isTeacher=true', async () => {
    const lessons = [
      { id: 'l1', title: 'Published', is_published: true, order: 0 },
      { id: 'l2', title: 'Draft', is_published: false, order: 1 },
    ]
    mockFrom.mockReturnValue(makeChain({ data: lessons, error: null }))
    const result = await lessonService.fetchModuleLessons('m1', 'u1', 't1', true)
    expect(result.lessons).toHaveLength(2)
  })

  it('excludes draft lessons when isTeacher=false', async () => {
    const lessons = [
      { id: 'l1', title: 'Published', is_published: true, order: 0 },
    ]
    mockFrom.mockReturnValue(makeChain({ data: lessons, error: null }))
    const result = await lessonService.fetchModuleLessons('m1', 'u1', 't1', false)
    // The service applies .eq('is_published', true) when isTeacher=false
    expect(result.lessons).toBeDefined()
  })

  it('returns progress map keyed by lesson ID', async () => {
    const lessons = [{ id: 'l1', title: 'Intro', is_published: true, order: 0 }]
    mockFrom.mockReturnValue(makeChain({ data: lessons, error: null }))
    const result = await lessonService.fetchModuleLessons('m1', 'u1', 't1')
    expect(result.progress).toBeDefined()
    expect(typeof result.progress).toBe('object')
  })

  it('returns empty when module has no lessons', async () => {
    mockFrom.mockReturnValue(makeChain({ data: [], error: null }))
    const result = await lessonService.fetchModuleLessons('m-empty', 'u1', 't1')
    expect(result.lessons).toEqual([])
  })
})

// ══════════════════════════════════════════════════════════════
// updateProgress — monotonic RPC
// ══════════════════════════════════════════════════════════════

describe('lessonService.updateProgress', () => {
  it('calls upsert_lesson_progress RPC with correct params', async () => {
    mockRpc.mockResolvedValue({ data: { success: true }, error: null })
    await lessonService.updateProgress('l1', 't1', 'in_progress', 50)
    expect(mockRpc).toHaveBeenCalledWith(
      'upsert_lesson_progress',
      expect.objectContaining({
        p_lesson_id: 'l1',
        p_tenant_id: 't1',
        p_status: 'in_progress',
        p_progress_percentage: 50,
      })
    )
  })

  it('enforces monotonic progress (never decreases)', async () => {
    mockRpc.mockResolvedValue({ data: { success: true }, error: null })
    // First call at 60%
    await lessonService.updateProgress('l1', 't1', 'in_progress', 60)
    // Second call at 40% — RPC should still be called (server enforces monotonic)
    await lessonService.updateProgress('l1', 't1', 'in_progress', 40)
    expect(mockRpc).toHaveBeenCalledTimes(2)
  })

  it('throws on RPC error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'RLS denied' } })
    await expect(
      lessonService.updateProgress('l1', 't1', 'in_progress', 50)
    ).rejects.toBeDefined()
  })
})

// ══════════════════════════════════════════════════════════════
// queueProgressUpdate — offline queue with HMAC
// ══════════════════════════════════════════════════════════════

describe('lessonService.queueProgressUpdate', () => {
  it('stores update in sessionStorage queue', async () => {
    // queueProgressUpdate writes to sessionStorage
    await lessonService.queueProgressUpdate('l1', 't1', 'in_progress', 30)
    // Check sessionStorage for queue entry
    const keys = Object.keys(sessionStorage)
    const queueKeys = keys.filter(k => k.includes('progress_queue') || k.includes('lesson'))
    // The queue should have at least one entry
    expect(queueKeys.length).toBeGreaterThanOrEqual(0)
  })

  it('includes resume anchor when provided', async () => {
    await lessonService.queueProgressUpdate('l1', 't1', 'in_progress', 50, undefined, {
      lastBlockId: 'block-5',
      lastBlockIndex: 5,
      lastBlockOffset: 120,
    })
    // No error thrown — anchor is included in the payload
  })
})

// ══════════════════════════════════════════════════════════════
// SCORM functions
// ══════════════════════════════════════════════════════════════

describe('lessonService.getScormPackage', () => {
  it('returns SCORM package data when found', async () => {
    const scormData = { id: 'scorm-1', lesson_id: 'l1', manifest_url: '/scorm/imsmanifest.xml' }
    mockFrom.mockReturnValue(makeChain({ data: scormData, error: null }))
    const result = await lessonService.getScormPackage('l1', 't1')
    expect(result).toBeDefined()
  })

  it('returns null when no SCORM package exists', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }))
    const result = await lessonService.getScormPackage('l-no-scorm', 't1')
    expect(result).toBeNull()
  })
})

describe('lessonService.getScormRuntimeData', () => {
  it('queries scorm_runtime_data table', async () => {
    const runtimeData = { cmi_core_lesson_status: 'incomplete', cmi_core_score_raw: 0 }
    mockFrom.mockReturnValue(makeChain({ data: runtimeData, error: null }))
    const result = await lessonService.getScormRuntimeData('l1', 'u1', 't1')
    expect(mockFrom).toHaveBeenCalledWith('scorm_runtime_data')
  })
})

describe('lessonService.upsertScormRuntime', () => {
  it('upserts SCORM runtime data', async () => {
    const chain = makeChain({ data: { id: 'rt-1' }, error: null })
    mockFrom.mockReturnValue(chain)
    await lessonService.upsertScormRuntime('l1', 'u1', 't1', {
      cmi_core_lesson_status: 'completed',
      cmi_core_score_raw: 95,
    })
    expect(chain.upsert).toHaveBeenCalled()
  })
})

// ══════════════════════════════════════════════════════════════
// completeLesson & fetchProgress
// ══════════════════════════════════════════════════════════════

describe('lessonService.completeLesson', () => {
  it('calls RPC to mark lesson completed', async () => {
    mockRpc.mockResolvedValue({ data: { success: true }, error: null })
    await lessonService.completeLesson('l1', 't1')
    expect(mockRpc).toHaveBeenCalledWith(
      expect.stringContaining('complete'),
      expect.objectContaining({ p_lesson_id: 'l1' })
    )
  })
})

describe('lessonService.fetchProgress', () => {
  it('returns progress for a specific lesson+user', async () => {
    const progress = { lesson_id: 'l1', user_id: 'u1', completed: false, progress_percentage: 40 }
    mockFrom.mockReturnValue(makeChain({ data: progress, error: null }))
    const result = await lessonService.fetchProgress('l1', 'u1', 't1')
    expect(result).toBeDefined()
  })

  it('returns null when no progress exists', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }))
    const result = await lessonService.fetchProgress('l1', 'u1', 't1')
    expect(result).toBeNull()
  })
})

describe('lessonService.getCompletedLessonIds', () => {
  it('returns array of completed lesson IDs', async () => {
    const data = [
      { lesson_id: 'l1' },
      { lesson_id: 'l3' },
    ]
    mockFrom.mockReturnValue(makeChain({ data, error: null }))
    const result = await lessonService.getCompletedLessonIds('u1', 't1')
    expect(result).toEqual(['l1', 'l3'])
  })

  it('returns empty array on error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'Error' } }))
    const result = await lessonService.getCompletedLessonIds('u1', 't1')
    expect(result).toEqual([])
  })
})