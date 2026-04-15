import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGenerateFromLesson = vi.fn()

vi.mock('@/features/ai-authoring', () => ({
  aiAuthoringService: {
    generateFromLesson: (...args: unknown[]) => mockGenerateFromLesson(...args),
  },
}))

import { aiQuizGenService } from '../api/aiQuizGenService'

describe('aiQuizGenService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateQuestions', () => {
    it('mendelegasikan ke aiAuthoringService.generateFromLesson', async () => {
      mockGenerateFromLesson.mockResolvedValue({
        generation_id: 'gen-1',
        questions: [],
        lesson_title: 'Geografi Indonesia',
      })

      const config = {
        lessonId: 'lesson-1',
        questionCount: 5,
        questionTypes: ['MCQ'],
        difficulty: 'medium',
        subject: 'Geografi',
        gradeLevel: '7',
        curriculumRef: 'kurikulum-merdeka',
      }

      const result = await aiQuizGenService.generateQuestions(config as any)

      expect(mockGenerateFromLesson).toHaveBeenCalledWith(config)
      expect(result.generation_id).toBe('gen-1')
    })

    it('meneruskan error dari aiAuthoringService', async () => {
      mockGenerateFromLesson.mockRejectedValue(new Error('Materi tidak ditemukan.'))
      await expect(
        aiQuizGenService.generateQuestions({
          lessonId: 'nonexistent',
          questionCount: 5,
          questionTypes: ['MCQ'],
          difficulty: 'medium',
          subject: 'Matematika',
          gradeLevel: '7',
          curriculumRef: '',
        } as any)
      ).rejects.toThrow('Materi tidak ditemukan.')
    })
  })
})
