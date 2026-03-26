import { describe, it, expect } from 'vitest'
import {
  computeDifficultyIndex,
  computeDiscriminationIndex,
  computeDiscriminationFromScores,
  computePointBiserial,
  classifyQuestionQuality,
  analyzeQuestions,
} from '../utils/itemAnalysis'

// ─── computeDifficultyIndex ──────────────────────────────

describe('computeDifficultyIndex', () => {
  it('returns 0 when nobody answers correctly', () => {
    expect(computeDifficultyIndex(0, 100)).toBe(0)
  })

  it('returns 1 when everyone answers correctly', () => {
    expect(computeDifficultyIndex(100, 100)).toBe(1)
  })

  it('returns 0.5 for half correct', () => {
    expect(computeDifficultyIndex(50, 100)).toBe(0.5)
  })

  it('returns 0 for zero total attempts', () => {
    expect(computeDifficultyIndex(0, 0)).toBe(0)
  })

  it('clamps to 0-1 range', () => {
    expect(computeDifficultyIndex(-5, 10)).toBe(0)
    expect(computeDifficultyIndex(15, 10)).toBe(1)
  })
})

// ─── computeDiscriminationIndex ──────────────────────────

describe('computeDiscriminationIndex', () => {
  it('returns positive when upper group outperforms lower', () => {
    expect(computeDiscriminationIndex(0.8, 0.2)).toBeCloseTo(0.6)
  })

  it('returns 0 when both groups perform equally', () => {
    expect(computeDiscriminationIndex(0.5, 0.5)).toBe(0)
  })

  it('returns negative when lower group outperforms upper', () => {
    expect(computeDiscriminationIndex(0.2, 0.8)).toBeCloseTo(-0.6)
  })

  it('clamps to -1 to 1 range', () => {
    expect(computeDiscriminationIndex(1.5, -0.5)).toBe(1)
    expect(computeDiscriminationIndex(-0.5, 1.5)).toBe(-1)
  })
})

// ─── computeDiscriminationFromScores ─────────────────────

describe('computeDiscriminationFromScores', () => {
  it('returns 0 for too few students (< 4)', () => {
    expect(
      computeDiscriminationFromScores([
        { totalScore: 90, isCorrect: true },
        { totalScore: 50, isCorrect: false },
      ])
    ).toBe(0)
  })

  it('computes positive discrimination for well-designed question', () => {
    // High-scorers get it right, low-scorers get it wrong
    const scores = [
      { totalScore: 95, isCorrect: true },
      { totalScore: 90, isCorrect: true },
      { totalScore: 85, isCorrect: true },
      { totalScore: 80, isCorrect: true },
      { totalScore: 50, isCorrect: false },
      { totalScore: 45, isCorrect: false },
      { totalScore: 40, isCorrect: false },
      { totalScore: 35, isCorrect: false },
    ]
    const d = computeDiscriminationFromScores(scores)
    expect(d).toBeGreaterThan(0)
  })

  it('computes negative discrimination for flawed question', () => {
    // Low-scorers get it right, high-scorers get it wrong
    const scores = [
      { totalScore: 95, isCorrect: false },
      { totalScore: 90, isCorrect: false },
      { totalScore: 85, isCorrect: false },
      { totalScore: 80, isCorrect: false },
      { totalScore: 50, isCorrect: true },
      { totalScore: 45, isCorrect: true },
      { totalScore: 40, isCorrect: true },
      { totalScore: 35, isCorrect: true },
    ]
    const d = computeDiscriminationFromScores(scores)
    expect(d).toBeLessThan(0)
  })

  it('returns 0 when everyone answers the same', () => {
    const scores = Array.from({ length: 10 }, (_, i) => ({
      totalScore: 50 + i * 5,
      isCorrect: true,
    }))
    const d = computeDiscriminationFromScores(scores)
    expect(d).toBe(0)
  })
})

// ─── computePointBiserial ────────────────────────────────

describe('computePointBiserial', () => {
  it('returns 0 for too few students', () => {
    expect(computePointBiserial([{ isCorrect: true, totalScore: 80 }])).toBe(0)
  })

  it('returns 0 when all students scored the same', () => {
    const scores = [
      { isCorrect: true, totalScore: 80 },
      { isCorrect: false, totalScore: 80 },
    ]
    expect(computePointBiserial(scores)).toBe(0)
  })

  it('returns 0 when everyone answered correctly', () => {
    const scores = [
      { isCorrect: true, totalScore: 90 },
      { isCorrect: true, totalScore: 80 },
    ]
    expect(computePointBiserial(scores)).toBe(0)
  })

  it('returns positive for good discrimination', () => {
    const scores = [
      { isCorrect: true, totalScore: 95 },
      { isCorrect: true, totalScore: 90 },
      { isCorrect: true, totalScore: 85 },
      { isCorrect: false, totalScore: 50 },
      { isCorrect: false, totalScore: 45 },
      { isCorrect: false, totalScore: 40 },
    ]
    const rpb = computePointBiserial(scores)
    expect(rpb).toBeGreaterThan(0)
  })

  it('returns negative for bad discrimination', () => {
    const scores = [
      { isCorrect: false, totalScore: 95 },
      { isCorrect: false, totalScore: 90 },
      { isCorrect: true, totalScore: 50 },
      { isCorrect: true, totalScore: 45 },
    ]
    const rpb = computePointBiserial(scores)
    expect(rpb).toBeLessThan(0)
  })
})

// ─── classifyQuestionQuality ─────────────────────────────

describe('classifyQuestionQuality', () => {
  it('classifies excellent (D ≥ 0.3, P in 0.3-0.7)', () => {
    expect(classifyQuestionQuality(0.5, 0.4)).toBe('excellent')
  })

  it('classifies good (D ≥ 0.2, P in 0.2-0.8)', () => {
    expect(classifyQuestionQuality(0.75, 0.25)).toBe('good')
  })

  it('classifies fair (D ≥ 0.1)', () => {
    expect(classifyQuestionQuality(0.1, 0.15)).toBe('fair')
  })

  it('classifies poor (D 0-0.1)', () => {
    expect(classifyQuestionQuality(0.5, 0.05)).toBe('poor')
  })

  it('classifies discard (D < 0)', () => {
    expect(classifyQuestionQuality(0.5, -0.2)).toBe('discard')
  })
})

// ─── analyzeQuestions ────────────────────────────────────

describe('analyzeQuestions', () => {
  it('returns analysis for multiple questions', () => {
    const data: Record<string, { totalScore: number; isCorrect: boolean }[]> = {
      q1: [
        { totalScore: 90, isCorrect: true },
        { totalScore: 85, isCorrect: true },
        { totalScore: 70, isCorrect: true },
        { totalScore: 50, isCorrect: false },
        { totalScore: 40, isCorrect: false },
      ],
      q2: [
        { totalScore: 90, isCorrect: false },
        { totalScore: 85, isCorrect: false },
        { totalScore: 70, isCorrect: true },
        { totalScore: 50, isCorrect: true },
        { totalScore: 40, isCorrect: true },
      ],
    }

    const results = analyzeQuestions(data)
    expect(results).toHaveLength(2)
    expect(results[0].question_id).toBe('q1')
    expect(results[0].difficulty).toBeCloseTo(0.6)
    expect(results[1].question_id).toBe('q2')
    expect(results[1].difficulty).toBeCloseTo(0.6)
    // q2 has negative discrimination (low-scorers correct, high-scorers wrong)
    expect(results[1].discrimination).toBeLessThan(0)
    expect(results[1].quality).toBe('discard')
  })

  it('handles empty data', () => {
    expect(analyzeQuestions({})).toEqual([])
  })
})
