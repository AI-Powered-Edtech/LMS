import { describe, expect, it } from 'vitest'

import {
  type GradeableQuestion,
  gradeAnswer,
  gradeAttempt,
  type StudentAnswer,
} from '../utils/autoGrader'

// ─── Helpers ─────────────────────────────────────────────

function mcq(overrides?: Partial<GradeableQuestion>): GradeableQuestion {
  return {
    id: 'q1',
    question_type: 'MCQ',
    points: 10,
    correct_option_ids: ['opt-a'],
    ...overrides,
  }
}

function answer(overrides?: Partial<StudentAnswer>): StudentAnswer {
  return {
    question_id: 'q1',
    selected_option_ids: ['opt-a'],
    ...overrides,
  }
}

// ─── MCQ ─────────────────────────────────────────────────

describe('autoGrader — MCQ', () => {
  it('scores correct answer as full points', () => {
    const result = gradeAnswer(mcq(), answer())
    expect(result.is_correct).toBe(true)
    expect(result.points_earned).toBe(10)
  })

  it('scores incorrect answer as 0', () => {
    const result = gradeAnswer(mcq(), answer({ selected_option_ids: ['opt-b'] }))
    expect(result.is_correct).toBe(false)
    expect(result.points_earned).toBe(0)
  })

  it('scores empty selection as 0', () => {
    const result = gradeAnswer(mcq(), answer({ selected_option_ids: [] }))
    expect(result.is_correct).toBe(false)
    expect(result.points_earned).toBe(0)
  })

  it('scores undefined answer as 0', () => {
    const result = gradeAnswer(mcq(), undefined)
    expect(result.is_correct).toBe(false)
    expect(result.points_earned).toBe(0)
    expect(result.max_points).toBe(10)
  })
})

// ─── TRUE_FALSE ──────────────────────────────────────────

describe('autoGrader — TRUE_FALSE', () => {
  const tf = mcq({ id: 'q2', question_type: 'TRUE_FALSE', correct_option_ids: ['opt-true'] })

  it('scores correct TRUE answer', () => {
    const result = gradeAnswer(tf, answer({ question_id: 'q2', selected_option_ids: ['opt-true'] }))
    expect(result.is_correct).toBe(true)
    expect(result.points_earned).toBe(10)
  })

  it('scores incorrect FALSE answer', () => {
    const result = gradeAnswer(
      tf,
      answer({ question_id: 'q2', selected_option_ids: ['opt-false'] })
    )
    expect(result.is_correct).toBe(false)
    expect(result.points_earned).toBe(0)
  })
})

// ─── MULTIPLE_SELECT ─────────────────────────────────────

describe('autoGrader — MULTIPLE_SELECT', () => {
  const ms = mcq({
    id: 'q3',
    question_type: 'MULTIPLE_SELECT',
    points: 10,
    correct_option_ids: ['opt-a', 'opt-c'],
  })

  it('scores exact match as full points', () => {
    const result = gradeAnswer(
      ms,
      answer({
        question_id: 'q3',
        selected_option_ids: ['opt-a', 'opt-c'],
      })
    )
    expect(result.is_correct).toBe(true)
    expect(result.points_earned).toBe(10)
  })

  it('scores partial correct with no wrong as partial credit', () => {
    const result = gradeAnswer(
      ms,
      answer({
        question_id: 'q3',
        selected_option_ids: ['opt-a'],
      })
    )
    expect(result.is_correct).toBe(false)
    // 1 correct out of 2 = 0.5 ratio → 5 points
    expect(result.points_earned).toBe(5)
    expect(result.partial_credit_ratio).toBe(0.5)
  })

  it('penalizes incorrect selections', () => {
    const result = gradeAnswer(
      ms,
      answer({
        question_id: 'q3',
        selected_option_ids: ['opt-a', 'opt-b'], // opt-b is wrong
      })
    )
    expect(result.is_correct).toBe(false)
    // 1 correct - 1 wrong = 0 net out of 2 → 0 ratio
    expect(result.points_earned).toBe(0)
  })

  it('scores all wrong as 0', () => {
    const result = gradeAnswer(
      ms,
      answer({
        question_id: 'q3',
        selected_option_ids: ['opt-b', 'opt-d'],
      })
    )
    expect(result.is_correct).toBe(false)
    expect(result.points_earned).toBe(0)
  })

  it('scores empty selection as 0', () => {
    const result = gradeAnswer(
      ms,
      answer({
        question_id: 'q3',
        selected_option_ids: [],
      })
    )
    expect(result.is_correct).toBe(false)
    expect(result.points_earned).toBe(0)
  })

  it('handles no correct options defined (empty quiz edge case)', () => {
    const noCorrect = mcq({
      question_type: 'MULTIPLE_SELECT',
      correct_option_ids: [],
    })
    const result = gradeAnswer(noCorrect, answer({ selected_option_ids: [] }))
    expect(result.is_correct).toBe(true)
    expect(result.points_earned).toBe(10)
  })
})

// ─── SHORT_ANSWER ────────────────────────────────────────

describe('autoGrader — SHORT_ANSWER', () => {
  const sa = mcq({
    id: 'q4',
    question_type: 'SHORT_ANSWER',
    points: 5,
    correct_option_ids: [],
    accepted_answers: ['Jakarta', 'DKI Jakarta'],
  })

  it('scores exact match (case-insensitive)', () => {
    const result = gradeAnswer(sa, {
      question_id: 'q4',
      selected_option_ids: [],
      text_answer: 'jakarta',
    })
    expect(result.is_correct).toBe(true)
    expect(result.points_earned).toBe(5)
  })

  it('scores alternate accepted answer', () => {
    const result = gradeAnswer(sa, {
      question_id: 'q4',
      selected_option_ids: [],
      text_answer: 'DKI JAKARTA',
    })
    expect(result.is_correct).toBe(true)
  })

  it('trims whitespace before matching', () => {
    const result = gradeAnswer(sa, {
      question_id: 'q4',
      selected_option_ids: [],
      text_answer: '  Jakarta  ',
    })
    expect(result.is_correct).toBe(true)
  })

  it('scores wrong text as 0', () => {
    const result = gradeAnswer(sa, {
      question_id: 'q4',
      selected_option_ids: [],
      text_answer: 'Bandung',
    })
    expect(result.is_correct).toBe(false)
    expect(result.points_earned).toBe(0)
  })

  it('scores empty string as 0', () => {
    const result = gradeAnswer(sa, { question_id: 'q4', selected_option_ids: [], text_answer: '' })
    expect(result.is_correct).toBe(false)
  })

  it('scores null text_answer as 0', () => {
    const result = gradeAnswer(sa, {
      question_id: 'q4',
      selected_option_ids: [],
      text_answer: null,
    })
    expect(result.is_correct).toBe(false)
  })
})

// ─── ESSAY ───────────────────────────────────────────────

describe('autoGrader — ESSAY', () => {
  const essay = mcq({ id: 'q5', question_type: 'ESSAY', points: 20, correct_option_ids: [] })

  it('always returns 0 (requires manual grading)', () => {
    const result = gradeAnswer(essay, {
      question_id: 'q5',
      selected_option_ids: [],
      text_answer: 'Some long essay...',
    })
    expect(result.is_correct).toBe(false)
    expect(result.points_earned).toBe(0)
    expect(result.max_points).toBe(20)
  })
})

// ─── gradeAttempt (aggregate) ────────────────────────────

describe('gradeAttempt', () => {
  it('aggregates scores across multiple questions', () => {
    const questions: GradeableQuestion[] = [
      { id: 'q1', question_type: 'MCQ', points: 10, correct_option_ids: ['a'] },
      { id: 'q2', question_type: 'MCQ', points: 10, correct_option_ids: ['b'] },
      {
        id: 'q3',
        question_type: 'SHORT_ANSWER',
        points: 5,
        correct_option_ids: [],
        accepted_answers: ['yes'],
      },
    ]
    const answers: Record<string, StudentAnswer> = {
      q1: { question_id: 'q1', selected_option_ids: ['a'] }, // correct
      q2: { question_id: 'q2', selected_option_ids: ['wrong'] }, // wrong
      q3: { question_id: 'q3', selected_option_ids: [], text_answer: 'yes' }, // correct
    }

    const result = gradeAttempt(questions, answers)
    expect(result.totalScore).toBe(15) // 10 + 0 + 5
    expect(result.maxScore).toBe(25) // 10 + 10 + 5
    expect(result.percentage).toBe(60) // 15/25 = 60%
    expect(result.results).toHaveLength(3)
  })

  it('handles empty quiz (no questions)', () => {
    const result = gradeAttempt([], {})
    expect(result.totalScore).toBe(0)
    expect(result.maxScore).toBe(0)
    expect(result.percentage).toBe(0)
  })

  it('handles unanswered questions', () => {
    const questions: GradeableQuestion[] = [
      { id: 'q1', question_type: 'MCQ', points: 10, correct_option_ids: ['a'] },
    ]

    const result = gradeAttempt(questions, {}) // no answers
    expect(result.totalScore).toBe(0)
    expect(result.maxScore).toBe(10)
    expect(result.percentage).toBe(0)
  })
})
