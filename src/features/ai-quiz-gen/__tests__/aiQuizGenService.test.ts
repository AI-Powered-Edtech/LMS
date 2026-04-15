import { beforeEach, describe, expect, it, vi } from 'vitest'

// ── Supabase Mock ─────────────────────────────────────────────────────────────

const mockFunctionsInvoke = vi.fn()

vi.mock('@/services/db', () => ({
  db: {
    functions: {
      invoke: (...args: unknown[]) => mockFunctionsInvoke(...args),
    },
  },
}))

import { aiQuizGenService } from '../api/aiQuizGenService'

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('aiQuizGenService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateQuestions', () => {
    it('mendelegasikan ke aiAuthoringService.generateFromLesson', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: {
          generation_id: 'gen-1',
          questions: [
            {
              id: 'q1',
              question_type: 'MCQ',
              text: 'Apa ibu kota Indonesia?',
              options: [
                { id: 'a', text: 'Jakarta' },
                { id: 'b', text: 'Bandung' },
              ],
              correct_option_ids: ['a'],
              points: 10,
            },
          ],
          lesson_title: 'Geografi Indonesia',
        },
        error: null,
      })

      const result = await aiQuizGenService.generateQuestions({
        lessonId: 'lesson-1',
        questionCount: 5,
        questionTypes: ['MCQ'],
        difficulty: 'medium',
        subject: 'Geografi',
        gradeLevel: '7',
        curriculumRef: 'kurikulum-merdeka',
      })

      expect(mockFunctionsInvoke).toHaveBeenCalledWith('generate-quiz-from-content', {
        body: expect.objectContaining({
          lesson_id: 'lesson-1',
          question_count: 5,
          question_types: ['MCQ'],
          difficulty: 'medium',
          subject: 'Geografi',
          grade_level: '7',
          curriculum_ref: 'kurikulum-merdeka',
        }),
      })
      expect(result.generation_id).toBe('gen-1')
      expect(result.questions).toHaveLength(1)
      expect(result.lesson_title).toBe('Geografi Indonesia')
    })

    it('melempar error ketika Edge Function gagal dengan LESSON_NOT_FOUND', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: null,
        error: { message: 'LESSON_NOT_FOUND: Lesson not found' },
      })

      await expect(
        aiQuizGenService.generateQuestions({
          lessonId: 'nonexistent',
          questionCount: 5,
          questionTypes: ['MCQ'],
          difficulty: 'medium',
          subject: 'Matematika',
          gradeLevel: '7',
          curriculumRef: '',
        })
      ).rejects.toThrow('Materi tidak ditemukan.')
    })

    it('melempar error ketika Edge Function gagal dengan INSUFFICIENT_CONTENT', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: null,
        error: { message: 'INSUFFICIENT_CONTENT: Content too short' },
      })

      await expect(
        aiQuizGenService.generateQuestions({
          lessonId: 'lesson-1',
          questionCount: 5,
          questionTypes: ['MCQ'],
          difficulty: 'medium',
          subject: 'IPA',
          gradeLevel: '8',
          curriculumRef: '',
        })
      ).rejects.toThrow(
        'Konten materi terlalu singkat untuk dibuat soal. Tambahkan lebih banyak materi.'
      )
    })

    it('melempar error ketika Edge Function gagal dengan RATE_LIMITED', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: null,
        error: { message: 'RATE_LIMITED: Too many requests' },
      })

      await expect(
        aiQuizGenService.generateQuestions({
          lessonId: 'lesson-1',
          questionCount: 5,
          questionTypes: ['MCQ'],
          difficulty: 'medium',
          subject: 'IPA',
          gradeLevel: '8',
          curriculumRef: '',
        })
      ).rejects.toThrow('Batas penggunaan AI tercapai. Coba lagi nanti.')
    })

    it('melempar error ketika data.error berisi kode error', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: { error: 'AI_GENERATION_FAILED' },
        error: null,
      })

      await expect(
        aiQuizGenService.generateQuestions({
          lessonId: 'lesson-1',
          questionCount: 5,
          questionTypes: ['MCQ'],
          difficulty: 'medium',
          subject: 'IPA',
          gradeLevel: '8',
          curriculumRef: '',
        })
      ).rejects.toThrow('Gagal berkomunikasi dengan AI. Coba lagi.')
    })

    it('melempar error default ketika kode error tidak dikenal', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: { error: 'UNKNOWN_ERROR' },
        error: null,
      })

      await expect(
        aiQuizGenService.generateQuestions({
          lessonId: 'lesson-1',
          questionCount: 5,
          questionTypes: ['MCQ'],
          difficulty: 'medium',
          subject: 'IPA',
          gradeLevel: '8',
          curriculumRef: '',
        })
      ).rejects.toThrow('Gagal membuat soal. Coba lagi.')
    })

    it('melempar error koneksi ketika gagal fetch', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Failed to fetch' },
      })

      await expect(
        aiQuizGenService.generateQuestions({
          lessonId: 'lesson-1',
          questionCount: 5,
          questionTypes: ['MCQ'],
          difficulty: 'medium',
          subject: 'IPA',
          gradeLevel: '8',
          curriculumRef: '',
        })
      ).rejects.toThrow('Gagal terhubung ke server. Periksa koneksi internet Anda.')
    })

    it('mengembalikan generation_id null ketika tidak ada di respons', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: {
          questions: [{ id: 'q1', question_type: 'MCQ', text: 'Test', points: 10 }],
          lesson_title: 'Test Lesson',
        },
        error: null,
      })

      const result = await aiQuizGenService.generateQuestions({
        lessonId: 'lesson-1',
        questionCount: 1,
        questionTypes: ['MCQ'],
        difficulty: 'easy',
        subject: 'Test',
        gradeLevel: '7',
        curriculumRef: '',
      })

      expect(result.generation_id).toBeNull()
      expect(result.questions).toBeDefined()
      expect(result.lesson_title).toBe('Test Lesson')
    })

    it('mendukung berbagai tipe soal', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: {
          generation_id: 'gen-2',
          questions: [
            { id: 'q1', question_type: 'MCQ', text: 'MCQ', points: 10 },
            { id: 'q2', question_type: 'TRUE_FALSE', text: 'T/F', points: 5 },
            { id: 'q3', question_type: 'SHORT_ANSWER', text: 'Short', points: 10 },
          ],
          lesson_title: 'Mixed Quiz',
        },
        error: null,
      })

      const result = await aiQuizGenService.generateQuestions({
        lessonId: 'lesson-1',
        questionCount: 10,
        questionTypes: ['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER'],
        difficulty: 'hard',
        subject: 'Campuran',
        gradeLevel: '9',
        curriculumRef: 'kurikulum-merdeka',
      })

      expect(mockFunctionsInvoke).toHaveBeenCalledWith(
        'generate-quiz-from-content',
        expect.objectContaining({
          body: expect.objectContaining({
            question_types: ['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER'],
            difficulty: 'hard',
          }),
        })
      )
      expect(result.questions).toHaveLength(3)
    })

    it('melempar error ketika INVALID_QUESTION_COUNT', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: null,
        error: { message: 'INVALID_QUESTION_COUNT: Must be 1-20' },
      })

      await expect(
        aiQuizGenService.generateQuestions({
          lessonId: 'lesson-1',
          questionCount: 50,
          questionTypes: ['MCQ'],
          difficulty: 'medium',
          subject: 'IPA',
          gradeLevel: '8',
          curriculumRef: '',
        })
      ).rejects.toThrow('Jumlah soal harus antara 1–20.')
    })
  })
})
