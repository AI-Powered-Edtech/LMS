import { describe, expect, it } from 'vitest'

import type { Lesson } from '../types'
import { formatDuration, getLessonDuration, getModuleDuration } from '../utils/lessonDuration'

describe('lessonDuration utils', () => {
  describe('getLessonDuration', () => {
    it('returns duration_minutes if set and > 0 (manual override)', () => {
      const lesson = { duration_minutes: 45, type: 'video' } as Lesson
      expect(getLessonDuration(lesson)).toBe(45)
    })

    it('falls back to auto-estimate if duration_minutes is 0', () => {
      const lesson = { duration_minutes: 0, type: 'video' } as Lesson
      expect(getLessonDuration(lesson)).toBe(5)
    })

    it('falls back to auto-estimate if duration_minutes is null', () => {
      const lesson = { duration_minutes: null, type: 'video' } as Lesson
      expect(getLessonDuration(lesson)).toBe(5)
    })

    it('estimates 5 minutes for video type', () => {
      const lesson = { type: 'video' } as Lesson
      expect(getLessonDuration(lesson)).toBe(5)
    })

    it('estimates 10 minutes for assignment type', () => {
      const lesson = { type: 'assignment' } as Lesson
      expect(getLessonDuration(lesson)).toBe(10)
    })

    it('estimates 3 minutes for unknown type', () => {
      const lesson = { type: 'unknown_type' } as Lesson
      expect(getLessonDuration(lesson)).toBe(3)
    })

    describe('article/text types', () => {
      it('returns 1 minute if content is empty or null', () => {
        expect(getLessonDuration({ type: 'article', content: '' } as Lesson)).toBe(1)
        expect(getLessonDuration({ type: 'text', content: null } as Lesson)).toBe(1)
      })

      it('estimates based on 200 words per minute (rounded)', () => {
        // 100 words -> 0.5 min -> rounded to 1
        const content100 = Array(100).fill('word').join(' ')
        expect(getLessonDuration({ type: 'article', content: content100 } as Lesson)).toBe(1)

        // 300 words -> 1.5 min -> rounded to 2
        const content300 = Array(300).fill('word').join(' ')
        expect(getLessonDuration({ type: 'text', content: content300 } as Lesson)).toBe(2)

        // 400 words -> 2 min
        const content400 = Array(400).fill('word').join(' ')
        expect(getLessonDuration({ type: 'article', content: content400 } as Lesson)).toBe(2)
      })
    })

    describe('quiz type', () => {
      it('counts total questions across all quizzes', () => {
        const lesson = {
          type: 'quiz',
          quizzes: [
            { quiz_questions: [{}, {}] }, // 2 questions
            { quiz_questions: [{}] }, // 1 question
          ],
        } as unknown as Lesson
        expect(getLessonDuration(lesson)).toBe(3)
      })

      it('falls back to quiz-type resources if no quiz questions are found', () => {
        const lesson = {
          type: 'quiz',
          quizzes: [],
          lesson_resources: [{ type: 'quiz' }, { type: 'video' }, { type: 'quiz' }],
        } as unknown as Lesson
        expect(getLessonDuration(lesson)).toBe(2)
      })

      it('returns minimum 1 minute if no questions or resources found', () => {
        const lesson = { type: 'quiz' } as Lesson
        expect(getLessonDuration(lesson)).toBe(1)
      })
    })
  })

  describe('getModuleDuration', () => {
    it('returns 0 for empty array', () => {
      expect(getModuleDuration([])).toBe(0)
    })

    it('sums the duration of all lessons', () => {
      const lessons = [
        { type: 'video' }, // 5 min
        { type: 'assignment' }, // 10 min
        { duration_minutes: 20, type: 'video' }, // 20 min override
      ] as Lesson[]
      expect(getModuleDuration(lessons)).toBe(35)
    })
  })

  describe('formatDuration', () => {
    it('formats minutes < 60', () => {
      expect(formatDuration(0)).toBe('0 menit')
      expect(formatDuration(5)).toBe('5 menit')
      expect(formatDuration(59)).toBe('59 menit')
    })

    it('formats exactly 60 minutes', () => {
      expect(formatDuration(60)).toBe('1j 0m')
    })

    it('formats minutes > 60', () => {
      expect(formatDuration(61)).toBe('1j 1m')
      expect(formatDuration(125)).toBe('2j 5m')
    })
  })
})
