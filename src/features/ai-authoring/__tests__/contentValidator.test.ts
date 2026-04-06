/**
 * Unit tests for AI Content Validator
 */

import { describe, expect, it } from 'vitest'

import { shouldFlagForModeration, validateAIContent } from '../utils/contentValidator'

describe('AI Content Validator', () => {
  describe('validateAIContent', () => {
    it('should validate clean content successfully', () => {
      const result = validateAIContent('This is a clean educational content about mathematics and science.')

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.qualityScore).toBeGreaterThan(0)
    })

    it('should detect inappropriate language', () => {
      const result = validateAIContent('This content contains inappropriate language and should be flagged.')

      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.includes('tidak pantas'))).toBe(true)
    })

    it('should validate quiz questions structure', () => {
      const content = 'Educational content about biology'
      const questions = [
        {
          text: 'What is the capital of Indonesia?',
          question_type: 'MCQ',
          options: [
            { text: 'Jakarta', is_correct: true },
            { text: 'Surabaya', is_correct: false },
          ],
          explanation: 'Jakarta is the capital',
        },
      ]

      const result = validateAIContent(content, { questions, assignmentType: 'quiz' })

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing question text', () => {
      const content = 'Educational content'
      const questions = [
        {
          text: '',
          question_type: 'MCQ',
          options: [
            { text: 'Option A', is_correct: true },
            { text: 'Option B', is_correct: false },
          ],
        },
      ]

      const result = validateAIContent(content, { questions, assignmentType: 'quiz' })

      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.includes('Teks soal wajib diisi'))).toBe(true)
    })

    it('should detect questions without correct answers', () => {
      const content = 'Educational content'
      const questions = [
        {
          text: 'What is 2+2?',
          question_type: 'MCQ',
          options: [
            { text: '3', is_correct: false },
            { text: '5', is_correct: false },
          ],
        },
      ]

      const result = validateAIContent(content, { questions, assignmentType: 'quiz' })

      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.includes('jawaban benar'))).toBe(true)
    })

    it('should validate reading content length', () => {
      const shortContent = 'Short'

      const result = validateAIContent(shortContent, { assignmentType: 'reading' })

      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.includes('terlalu pendek'))).toBe(true)
    })

    it('should validate writing content length', () => {
      const shortContent = 'Short'

      const result = validateAIContent(shortContent, { assignmentType: 'writing' })

      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.includes('terlalu pendek'))).toBe(true)
    })

    it('should calculate quality score', () => {
      const content = 'This is a comprehensive educational content about mathematics. It covers various topics including algebra, geometry, and calculus. Students will learn fundamental concepts and problem-solving techniques.'

      const questions = [
        {
          text: 'What is algebra?',
          question_type: 'MCQ',
          options: [
            { text: 'Math branch', is_correct: true },
            { text: 'Geometry', is_correct: false },
          ],
          explanation: 'Algebra is a branch of mathematics',
        },
        {
          text: 'What is geometry?',
          question_type: 'MCQ',
          options: [
            { text: 'Shapes', is_correct: true },
            { text: 'Numbers', is_correct: false },
          ],
          explanation: 'Geometry studies shapes',
        },
        {
          text: 'What is calculus?',
          question_type: 'MCQ',
          options: [
            { text: 'Change', is_correct: true },
            { text: 'Statistics', is_correct: false },
          ],
          explanation: 'Calculus studies change',
        },
      ]

      const result = validateAIContent(content, { questions, assignmentType: 'quiz' })

      expect(result.qualityScore).toBeGreaterThan(50)
    })

    it('should return warnings for excessive capitalization', () => {
      const content = 'THIS IS ALL CAPITALIZED CONTENT THAT LOOKS LIKE SPAM AND SHOULD TRIGGER A WARNING ABOUT EXCESSIVE UPPERCASE LETTERS IN THE TEXT'

      const result = validateAIContent(content)

      expect(result.warnings.some((w) => w.includes('huruf kapital'))).toBe(true)
    })

    it('should handle empty content', () => {
      const result = validateAIContent('')

      expect(result.isValid).toBe(true)
      expect(result.qualityScore).toBeLessThan(50)
    })
  })

  describe('shouldFlagForModeration', () => {
    it('should flag content with errors', () => {
      const validation = validateAIContent('Inappropriate content here')

      expect(shouldFlagForModeration(validation)).toBe(true)
    })

    it('should flag content with low quality score', () => {
      const validation = validateAIContent('Short')

      // Quality score will be low due to short content
      expect(shouldFlagForModeration(validation)).toBe(true)
    })

    it('should not flag good quality content', () => {
      const content =
        'This is high quality educational content about science and mathematics with proper structure and explanations.'
      const validation = validateAIContent(content)

      expect(shouldFlagForModeration(validation)).toBe(false)
    })
  })
})
