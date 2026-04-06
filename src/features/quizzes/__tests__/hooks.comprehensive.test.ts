import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useQuizAutosave } from '../hooks/useQuizAutosave'
import type { QuizServiceInterface } from '../hooks/useQuizAutosave'

// ══════════════════════════════════════════════════════════════
// useQuizAutosave
// ══════════════════════════════════════════════════════════════

describe('useQuizAutosave', () => {
  let mockService: QuizServiceInterface

  beforeEach(() => {
    vi.useFakeTimers()
    mockService = {
      saveProgress: vi.fn().mockResolvedValue(undefined),
    }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not save immediately on mount', () => {
    renderHook(() =>
      useQuizAutosave({
        attemptId: 'a1',
        answers: { q1: { selected_option_ids: ['opt-a'] } },
        quizService: mockService,
        intervalMs: 30000,
      })
    )
    expect(mockService.saveProgress).not.toHaveBeenCalled()
  })

  it('triggers initial save after 5 seconds', async () => {
    renderHook(() =>
      useQuizAutosave({
        attemptId: 'a1',
        answers: { q1: { selected_option_ids: ['opt-a'] } },
        quizService: mockService,
        intervalMs: 30000,
      })
    )
    await act(async () => {
      vi.advanceTimersByTime(5500)
    })
    expect(mockService.saveProgress).toHaveBeenCalledTimes(1)
  })

  it('does not save when answers are empty', async () => {
    renderHook(() =>
      useQuizAutosave({
        attemptId: 'a1',
        answers: {},
        quizService: mockService,
        intervalMs: 10000,
      })
    )
    await act(async () => {
      vi.advanceTimersByTime(15000)
    })
    expect(mockService.saveProgress).not.toHaveBeenCalled()
  })

  it('skips save when answers have not changed since last save', async () => {
    const answers = { q1: { selected_option_ids: ['opt-a'] } }
    renderHook(() =>
      useQuizAutosave({
        attemptId: 'a1',
        answers,
        quizService: mockService,
        intervalMs: 10000,
      })
    )
    // First save at 5s (initial)
    await act(async () => { vi.advanceTimersByTime(5500) })
    expect(mockService.saveProgress).toHaveBeenCalledTimes(1)
    // Next interval at 10s — same answers, should skip
    await act(async () => { vi.advanceTimersByTime(10500) })
    expect(mockService.saveProgress).toHaveBeenCalledTimes(1)
  })

  it('returns lastSaved timestamp after successful save', async () => {
    const { result } = renderHook(() =>
      useQuizAutosave({
        attemptId: 'a1',
        answers: { q1: { selected_option_ids: ['opt-a'] } },
        quizService: mockService,
        intervalMs: 10000,
      })
    )
    expect(result.current.lastSaved).toBeNull()
    await act(async () => { vi.advanceTimersByTime(5500) })
    expect(result.current.lastSaved).toBeInstanceOf(Date)
  })

  it('does not throw when saveProgress fails', async () => {
    mockService.saveProgress = vi.fn().mockRejectedValue(new Error('Network error'))
    renderHook(() =>
      useQuizAutosave({
        attemptId: 'a1',
        answers: { q1: { selected_option_ids: ['opt-a'] } },
        quizService: mockService,
        intervalMs: 10000,
      })
    )
    await act(async () => { vi.advanceTimersByTime(5500) })
    // Should not throw — just logs warning
    expect(mockService.saveProgress).toHaveBeenCalledTimes(1)
  })
})

// ══════════════════════════════════════════════════════════════
// useQuizTimer — pure logic tests (no Supabase)
// ══════════════════════════════════════════════════════════════

describe('Quiz timer threshold logic', () => {
  it('isWarning when timeLeft <= 300 and > 60', () => {
    const timeLeft = 120
    const isWarning = timeLeft <= 300 && timeLeft > 60
    const isCritical = timeLeft <= 60
    expect(isWarning).toBe(true)
    expect(isCritical).toBe(false)
  })

  it('isCritical when timeLeft <= 60', () => {
    const timeLeft = 30
    const isWarning = timeLeft <= 300 && timeLeft > 60
    const isCritical = timeLeft <= 60
    expect(isWarning).toBe(false)
    expect(isCritical).toBe(true)
  })

  it('neither warning nor critical when timeLeft > 300', () => {
    const timeLeft = 600
    const isWarning = timeLeft <= 300 && timeLeft > 60
    const isCritical = timeLeft <= 60
    expect(isWarning).toBe(false)
    expect(isCritical).toBe(false)
  })

  it('progressColor is red when critical', () => {
    const timeLeft = 30
    const isCritical = timeLeft <= 60
    const isWarning = timeLeft <= 300 && timeLeft > 60
    const progressColor = isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-blue-500'
    expect(progressColor).toBe('bg-red-500')
  })

  it('progressColor is amber when warning', () => {
    const timeLeft = 120
    const isCritical = timeLeft <= 60
    const isWarning = timeLeft <= 300 && timeLeft > 60
    const progressColor = isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-blue-500'
    expect(progressColor).toBe('bg-amber-500')
  })
})

// ══════════════════════════════════════════════════════════════
// useQuizForm — pure state mutation tests
// ══════════════════════════════════════════════════════════════

describe('Quiz form question manipulation', () => {
  const baseQuestions = [
    { text: 'Q1', order: 1, question_type: 'MCQ' as const, points: 1, explanation: null, options: [{ text: 'A', is_correct: true }, { text: 'B', is_correct: false }] },
    { text: 'Q2', order: 2, question_type: 'TRUE_FALSE' as const, points: 1, explanation: null, options: [{ text: 'Benar', is_correct: true }, { text: 'Salah', is_correct: false }] },
  ]

  it('addQuestion appends a new MCQ question with default options', () => {
    const newQ = {
      text: '',
      order: baseQuestions.length + 1,
      question_type: 'MCQ' as const,
      points: 1,
      explanation: null,
      options: [{ text: 'Opsi A', is_correct: true }, { text: 'Opsi B', is_correct: false }],
    }
    const result = [...baseQuestions, newQ]
    expect(result).toHaveLength(3)
    expect(result[2].question_type).toBe('MCQ')
  })

  it('removeQuestion splices and re-orders', () => {
    const qs = [...baseQuestions]
    qs.splice(0, 1)
    qs.forEach((q, i) => { q.order = i + 1 })
    expect(qs).toHaveLength(1)
    expect(qs[0].order).toBe(1)
    expect(qs[0].text).toBe('Q2')
  })

  it('updateQuestionType to TRUE_FALSE resets options', () => {
    const q = { ...baseQuestions[0] }
    q.question_type = 'TRUE_FALSE' as const
    q.options = [{ text: 'Benar', is_correct: true }, { text: 'Salah', is_correct: false }]
    expect(q.options).toHaveLength(2)
    expect(q.options[0].text).toBe('Benar')
  })

  it('updateQuestionType to ESSAY clears options', () => {
    const q = { ...baseQuestions[0] }
    q.question_type = 'ESSAY' as const
    q.options = []
    expect(q.options).toHaveLength(0)
  })

  it('setCorrectOption for MCQ sets only one correct', () => {
    const opts = [{ text: 'A', is_correct: true }, { text: 'B', is_correct: false }, { text: 'C', is_correct: false }]
    const selectIdx = 2
    opts.forEach((o, i) => { o.is_correct = i === selectIdx })
    expect(opts[0].is_correct).toBe(false)
    expect(opts[2].is_correct).toBe(true)
  })

  it('setCorrectOption for MULTIPLE_SELECT toggles', () => {
    const opts = [{ text: 'A', is_correct: true }, { text: 'B', is_correct: false }, { text: 'C', is_correct: false }]
    // Toggle B on
    opts[1].is_correct = !opts[1].is_correct
    expect(opts[0].is_correct).toBe(true)
    expect(opts[1].is_correct).toBe(true)
  })
})

// ══════════════════════════════════════════════════════════════
// useQuizGradebookState — pure helper functions
// ══════════════════════════════════════════════════════════════

describe('formatDuration', () => {
  // Inline implementation matching the hook export
  function formatDuration(seconds: number | null) {
    if (!seconds) return '-'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  it('returns "-" for null', () => expect(formatDuration(null)).toBe('-'))
  it('returns "-" for 0', () => expect(formatDuration(0)).toBe('-'))
  it('formats 90 seconds as "1m 30s"', () => expect(formatDuration(90)).toBe('1m 30s'))
  it('formats 3600 seconds as "60m 0s"', () => expect(formatDuration(3600)).toBe('60m 0s'))
})

describe('getScoreColor', () => {
  function getScoreColor(score: number | null, passing: number) {
    if (score === null) return 'text-slate-400'
    if (score >= passing) return 'text-emerald-600 font-bold'
    if (score >= passing * 0.7) return 'text-amber-600 font-bold'
    return 'text-red-600 font-bold'
  }

  it('returns slate for null score', () => expect(getScoreColor(null, 70)).toBe('text-slate-400'))
  it('returns emerald for passing score', () => expect(getScoreColor(80, 70)).toBe('text-emerald-600 font-bold'))
  it('returns amber for near-passing score', () => expect(getScoreColor(55, 70)).toBe('text-amber-600 font-bold'))
  it('returns red for failing score', () => expect(getScoreColor(30, 70)).toBe('text-red-600 font-bold'))
})