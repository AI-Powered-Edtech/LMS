import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockInvoke = vi.fn()
const mockRpc = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/services/db', () => ({
  db: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import { aiBuilderCopilotService } from '../api/aiBuilderCopilotService'

describe('aiBuilderCopilotService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps course access errors from edge functions into Indonesian message', async () => {
    mockInvoke.mockResolvedValue({
      data: { error: 'FORBIDDEN_NO_COURSE_ACCESS' },
      error: null,
    })

    await expect(
      aiBuilderCopilotService.generateOutline({
        course_id: 'course-1',
        course_title: 'Matematika Dasar',
      })
    ).rejects.toThrow('Anda tidak memiliki akses ke kursus ini.')
  })

  it('filters artifact history by created_by and returns pagination metadata', async () => {
    const rows = [
      {
        id: 'artifact-1',
        tenant_id: 'tenant-1',
        course_id: 'course-1',
        created_by: 'user-1',
        artifact_kind: 'outline',
        target_type: 'course',
        target_id: 'course-1',
        source_type: 'prompt',
        source_ref_id: null,
        prompt_config: {},
        output: { modules: [] },
        status: 'generated',
        created_at: '2026-04-09T10:00:00.000Z',
        updated_at: '2026-04-09T10:00:00.000Z',
      },
    ]

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      then: (resolve: (value: unknown) => unknown) => resolve({ data: rows, error: null }),
    }

    mockFrom.mockReturnValue(chain)

    const result = await aiBuilderCopilotService.fetchArtifactHistory(
      'course-1',
      'user-1',
      null,
      20
    )

    expect(mockFrom).toHaveBeenCalledWith('ai_builder_artifacts')
    expect(chain.eq).toHaveBeenCalledWith('course_id', 'course-1')
    expect(chain.eq).toHaveBeenCalledWith('created_by', 'user-1')
    expect(result.items).toHaveLength(1)
    expect(result.hasMore).toBe(false)
  })
})
