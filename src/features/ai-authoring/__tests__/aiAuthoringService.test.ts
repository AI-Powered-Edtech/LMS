import { beforeEach, describe, expect, it, vi } from 'vitest'

// ── DB Mock (vi.hoisted untuk referensi stabil) ──────────────────────────────

const { mockFrom, mockInvoke } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockInvoke: vi.fn(),
}))

vi.mock('@/services/db', () => ({
  db: {
    from: (...args: unknown[]) => mockFrom(...args),
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}))

import { aiAuthoringService } from '../api/aiAuthoringService'
import type { AIGeneratedContent, AIQuizQuestion } from '../types'

// ── Helpers ─────────────────────────────────────────────────────────────────

function createChainMock(resolvedValue: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  const promise = Promise.resolve(resolvedValue)
  chain.then = vi.fn(
    (onFulfilled?: (v: unknown) => unknown, onRejected?: (v: unknown) => unknown) =>
      promise.then(onFulfilled, onRejected)
  )
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.delete = vi.fn().mockReturnValue(chain)
  return chain
}

function makeAIQuestion(overrides?: Partial<AIQuizQuestion>): AIQuizQuestion {
  return {
    id: 'q-1',
    question_type: 'MCQ',
    text: 'Berapa 2 + 2?',
    options: [
      { text: '3', is_correct: false },
      { text: '4', is_correct: true },
      { text: '5', is_correct: false },
    ],
    explanation: '2 + 2 = 4',
    points: 10,
    ...overrides,
  }
}

function makeHistoryEntry(overrides?: Partial<AIGeneratedContent>): AIGeneratedContent {
  return {
    id: 'gen-1',
    tenant_id: 'tenant-1',
    created_by: 'user-1',
    file_name: 'Materi Matematika',
    file_type: 'pdf',
    source_type: 'file',
    lesson_id: null,
    subject: 'Matematika',
    grade_level: 'VII',
    curriculum_ref: 'Kurikulum Merdeka',
    assignment_type: 'quiz',
    bloom_level: 'C2',
    question_count: 5,
    summary: 'Soal matematika dasar',
    questions: [makeAIQuestion()],
    used_at: null,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
    ...overrides,
  }
}

// ── generateFromFile ────────────────────────────────────────────────────────

describe('aiAuthoringService — generateFromFile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('mengembalikan questions dari Edge Function response', async () => {
    const questions = [makeAIQuestion()]
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          generation_id: 'gen-1',
          type: 'quiz',
          tenant_id: 'tenant-1',
          summary: 'Generated quiz',
          questions,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const formData = new FormData()
    const result = await aiAuthoringService.generateFromFile(formData)

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)
    expect(result.questions).toHaveLength(1)
    expect(result.generation_id).toBe('gen-1')
  })

  it('melempar error spesifik untuk rate limit', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: '429 Too Many Requests: RATE_LIMITED' }), {
        status: 429,
        headers: { 'content-type': 'application/json' },
      })
    )

    const formData = new FormData()
    await expect(aiAuthoringService.generateFromFile(formData)).rejects.toThrow(
      'Batas penggunaan AI tercapai (20 per jam)'
    )
  })

  it('melempar error spesifik untuk unauthorized role', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: 'UNAUTHORIZED_ROLE' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      })
    )

    const formData = new FormData()
    await expect(aiAuthoringService.generateFromFile(formData)).rejects.toThrow(
      'Anda tidak memiliki izin menggunakan fitur ini'
    )
  })

  it('melempar error jika respons AI tidak memiliki questions array', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ generation_id: 'gen-1', type: 'quiz', tenant_id: 't1', summary: 'test' }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const formData = new FormData()
    await expect(aiAuthoringService.generateFromFile(formData)).rejects.toThrow(
      'Respons AI tidak valid'
    )
  })

  it('melempar error spesifik untuk insufficient content', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: 'INSUFFICIENT_CONTENT' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    const formData = new FormData()
    await expect(aiAuthoringService.generateFromFile(formData)).rejects.toThrow(
      'Konten dokumen terlalu sedikit'
    )
  })

  it('melempar error untuk network failure', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: 'Failed to fetch' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      })
    )

    const formData = new FormData()
    await expect(aiAuthoringService.generateFromFile(formData)).rejects.toThrow(
      'Gagal terhubung ke server'
    )
  })

  it('menggunakan legacy id field jika generation_id tidak ada', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'legacy-id',
          type: 'quiz',
          tenant_id: 'tenant-1',
          summary: 'Test',
          questions: [makeAIQuestion()],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    const formData = new FormData()
    const result = await aiAuthoringService.generateFromFile(formData)

    expect(result.generation_id).toBe('legacy-id')
  })
})

// ── generateFromLesson ──────────────────────────────────────────────────────

describe('aiAuthoringService — generateFromLesson', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('mengirim config yang benar ke Edge Function', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          generation_id: 'gen-2',
          questions: [makeAIQuestion()],
          lesson_title: 'Pecahan',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    await aiAuthoringService.generateFromLesson({
      lessonId: 'lesson-1',
      questionCount: 5,
      questionTypes: ['MCQ', 'TRUE_FALSE'],
      difficulty: 'medium',
    })

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    const parsed = JSON.parse(init.body as string) as Record<string, unknown>
    expect(parsed.lesson_id).toBe('lesson-1')
    expect(parsed.question_count).toBe(5)
    expect(parsed.question_types).toEqual(['MCQ', 'TRUE_FALSE'])
    expect(parsed.difficulty).toBe('medium')
  })

  it('melempar error spesifik untuk LESSON_NOT_FOUND', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: 'LESSON_NOT_FOUND' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      })
    )

    await expect(
      aiAuthoringService.generateFromLesson({
        lessonId: 'lesson-99',
        questionCount: 5,
        questionTypes: ['MCQ'],
        difficulty: 'easy',
      })
    ).rejects.toThrow('Materi tidak ditemukan')
  })

  it('melempar error spesifik untuk INSUFFICIENT_CONTENT', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: 'INSUFFICIENT_CONTENT' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    await expect(
      aiAuthoringService.generateFromLesson({
        lessonId: 'lesson-1',
        questionCount: 5,
        questionTypes: ['MCQ'],
        difficulty: 'easy',
      })
    ).rejects.toThrow('Konten materi terlalu singkat')
  })

  it('melempar error spesifik untuk INVALID_QUESTION_COUNT', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: 'INVALID_QUESTION_COUNT' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      })
    )

    await expect(
      aiAuthoringService.generateFromLesson({
        lessonId: 'lesson-1',
        questionCount: 5,
        questionTypes: ['MCQ'],
        difficulty: 'easy',
      })
    ).rejects.toThrow('Jumlah soal harus antara 1–20')
  })

  it('mengembalikan response dengan generation_id dan questions', async () => {
    const questions = [makeAIQuestion(), makeAIQuestion({ id: 'q-2', text: 'Soal kedua' })]
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ generation_id: 'gen-3', questions, lesson_title: 'Aljabar' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    const result = await aiAuthoringService.generateFromLesson({
      lessonId: 'lesson-1',
      questionCount: 10,
      questionTypes: ['MCQ'],
      difficulty: 'hard',
    })

    expect(result.generation_id).toBe('gen-3')
    expect(result.questions).toHaveLength(2)
    expect(result.lesson_title).toBe('Aljabar')
  })

  it('mengembalikan null generation_id jika tidak ada di response', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ questions: [makeAIQuestion()], lesson_title: 'Geometri' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )

    const result = await aiAuthoringService.generateFromLesson({
      lessonId: 'lesson-1',
      questionCount: 3,
      questionTypes: ['MCQ'],
      difficulty: 'easy',
    })

    expect(result.generation_id).toBeNull()
  })
})

// ── fetchHistory ────────────────────────────────────────────────────────────

describe('aiAuthoringService — fetchHistory', () => {
  beforeEach(() => vi.clearAllMocks())

  it('mengembalikan 20 entri terbaru untuk user', async () => {
    const entries = [makeHistoryEntry(), makeHistoryEntry({ id: 'gen-2', file_name: 'Materi IPA' })]
    const chain = createChainMock({ data: entries, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await aiAuthoringService.fetchHistory('user-1')

    expect(mockFrom).toHaveBeenCalledWith('ai_generated_content')
    expect(chain.eq).toHaveBeenCalledWith('created_by', 'user-1')
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(chain.limit).toHaveBeenCalledWith(20)
    expect(result).toHaveLength(2)
  })

  it('mengembalikan array kosong jika tidak ada history', async () => {
    const chain = createChainMock({ data: [], error: null })
    mockFrom.mockReturnValue(chain)

    const result = await aiAuthoringService.fetchHistory('user-1')
    expect(result).toEqual([])
  })

  it('throw error jika query gagal', async () => {
    const chain = createChainMock({ data: null, error: { message: 'History query failed' } })
    mockFrom.mockReturnValue(chain)

    await expect(aiAuthoringService.fetchHistory('user-1')).rejects.toThrow('History query failed')
  })
})

// ── markAsUsed ──────────────────────────────────────────────────────────────

describe('aiAuthoringService — markAsUsed', () => {
  beforeEach(() => vi.clearAllMocks())

  it('mengupdate used_at pada generation', async () => {
    const chain = createChainMock({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    await aiAuthoringService.markAsUsed('gen-1')

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ used_at: expect.any(String) })
    )
  })

  it('throw error jika update gagal', async () => {
    const chain = createChainMock({ data: null, error: { message: 'Update failed' } })
    mockFrom.mockReturnValue(chain)

    await expect(aiAuthoringService.markAsUsed('gen-1')).rejects.toThrow('Update failed')
  })
})

// ── updateQuestions ─────────────────────────────────────────────────────────

describe('aiAuthoringService — updateQuestions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('mengupdate questions pada generation', async () => {
    const questions = [makeAIQuestion({ text: 'Updated question' })]
    const chain = createChainMock({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    await aiAuthoringService.updateQuestions('gen-1', questions)

    expect(chain.update).toHaveBeenCalledWith({ questions })
  })

  it('throw error jika update gagal', async () => {
    const chain = createChainMock({ data: null, error: { message: 'Questions update failed' } })
    mockFrom.mockReturnValue(chain)

    await expect(aiAuthoringService.updateQuestions('gen-1', [])).rejects.toThrow(
      'Questions update failed'
    )
  })
})

// ── deleteGeneration ────────────────────────────────────────────────────────

describe('aiAuthoringService — deleteGeneration', () => {
  beforeEach(() => vi.clearAllMocks())

  it('menghapus generation berdasarkan id', async () => {
    const chain = createChainMock({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    await aiAuthoringService.deleteGeneration('gen-1')

    expect(chain.delete).toHaveBeenCalled()
    expect(chain.eq).toHaveBeenCalledWith('id', 'gen-1')
  })

  it('throw error jika delete gagal', async () => {
    const chain = createChainMock({ data: null, error: { message: 'Delete failed' } })
    mockFrom.mockReturnValue(chain)

    await expect(aiAuthoringService.deleteGeneration('gen-1')).rejects.toThrow('Delete failed')
  })
})
