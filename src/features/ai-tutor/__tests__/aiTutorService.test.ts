import { describe, it, expect, vi, beforeEach } from 'vitest'
import { askTutor } from '../api/aiTutorService'

const mockInvoke = vi.fn()

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}))

describe('askTutor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('harus mengembalikan data AI response saat sukses', async () => {
    const mockResponse = { response: 'Ini adalah jawaban AI', difficulty: 'medium' }
    mockInvoke.mockResolvedValue({ data: mockResponse, error: null })

    const result = await askTutor('lesson-1', 'Apa itu fotosintesis?', 'tenant-1')
    expect(mockInvoke).toHaveBeenCalledWith('ai-tutor', {
      body: {
        lesson_id: 'lesson-1',
        question: 'Apa itu fotosintesis?',
        tenant_id: 'tenant-1',
        session_id: undefined,
      },
    })
    expect(result.data).toEqual(mockResponse)
    expect(result.error).toBeUndefined()
  })

  it('harus mengembalikan error saat edge function gagal', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Failed to send a request' },
    })

    const result = await askTutor('lesson-1', 'test', 'tenant-1')
    expect(result.error).toBeDefined()
    expect(result.error!.code).toBe('EDGE_FUNCTION_ERROR')
  })

  it('harus mengembalikan error saat response kosong', async () => {
    mockInvoke.mockResolvedValue({ data: { response: '' }, error: null })

    const result = await askTutor('lesson-1', 'test', 'tenant-1')
    expect(result.error).toBeDefined()
    expect(result.error!.code).toBe('TUTOR_ERROR')
  })
})
