import { describe, expect, it } from 'vitest'

import type { DragDropData, FillBlankData, FlashcardData, SortingData } from '../types'
import {
  scoreDragDrop,
  scoreFillBlank,
  scoreFlashcard,
  scoreSorting,
} from '../utils/interactiveScoring'

// ── scoreFlashcard ───────────────────────────────────────────────

describe('scoreFlashcard', () => {
  const data: FlashcardData = {
    shuffleOnLoad: false,
    cards: [
      { id: 'c1', front: 'Q1', back: 'A1', order: 0 },
      { id: 'c2', front: 'Q2', back: 'A2', order: 1 },
      { id: 'c3', front: 'Q3', back: 'A3', order: 2 },
    ],
  }

  it('returns 0 when no cards are flipped', () => {
    const result = scoreFlashcard(data, new Set())
    expect(result.score).toBe(0)
    expect(result.flippedCount).toBe(0)
    expect(result.totalCount).toBe(3)
  })

  it('returns partial score when some cards are flipped', () => {
    const result = scoreFlashcard(data, new Set(['c1', 'c2']))
    expect(result.score).toBe(67)
    expect(result.flippedCount).toBe(2)
    expect(result.totalCount).toBe(3)
  })

  it('returns 100 when all cards are flipped', () => {
    const result = scoreFlashcard(data, new Set(['c1', 'c2', 'c3']))
    expect(result.score).toBe(100)
    expect(result.flippedCount).toBe(3)
    expect(result.totalCount).toBe(3)
  })

  it('handles empty card array', () => {
    const emptyData: FlashcardData = { cards: [], shuffleOnLoad: false }
    const result = scoreFlashcard(emptyData, new Set(['c1']))
    expect(result.score).toBe(0)
    expect(result.totalCount).toBe(0)
  })
})

// ── scoreDragDrop ────────────────────────────────────────────────

describe('scoreDragDrop', () => {
  const data: DragDropData = {
    showFeedback: true,
    categories: [
      { id: 'cat1', label: 'Kategori 1', color: '#6366f1' },
      { id: 'cat2', label: 'Kategori 2', color: '#f59e0b' },
    ],
    items: [
      { id: 'item1', label: 'Item 1', categoryId: 'cat1' },
      { id: 'item2', label: 'Item 2', categoryId: 'cat2' },
      { id: 'item3', label: 'Item 3', categoryId: 'cat1' },
    ],
  }

  it('returns 0 when all items are unassigned', () => {
    const result = scoreDragDrop(data, {})
    expect(result.score).toBe(0)
    expect(result.correctCount).toBe(0)
    expect(result.totalCount).toBe(3)
  })

  it('returns 100 when all items are correctly placed', () => {
    const placed = { item1: 'cat1', item2: 'cat2', item3: 'cat1' }
    const result = scoreDragDrop(data, placed)
    expect(result.score).toBe(100)
    expect(result.correctCount).toBe(3)
  })

  it('returns partial score for partially correct placement', () => {
    const placed = { item1: 'cat1', item2: 'cat1', item3: 'cat2' }
    const result = scoreDragDrop(data, placed)
    expect(result.score).toBe(33)
    expect(result.correctCount).toBe(1)
  })

  it('handles empty items', () => {
    const emptyData: DragDropData = { showFeedback: true, categories: [], items: [] }
    const result = scoreDragDrop(emptyData, {})
    expect(result.score).toBe(0)
    expect(result.totalCount).toBe(0)
  })
})

// ── scoreSorting ─────────────────────────────────────────────────

describe('scoreSorting', () => {
  const data: SortingData = {
    instruction: 'Urutkan',
    showFeedback: true,
    items: [
      { id: 's1', label: 'Pertama', correctIndex: 0 },
      { id: 's2', label: 'Kedua', correctIndex: 1 },
      { id: 's3', label: 'Ketiga', correctIndex: 2 },
    ],
  }

  it('returns 100 when order is fully correct', () => {
    const result = scoreSorting(data, ['s1', 's2', 's3'])
    expect(result.score).toBe(100)
    expect(result.correctPositions).toEqual([0, 1, 2])
    expect(result.totalCount).toBe(3)
  })

  it('returns 0 when order is completely wrong', () => {
    const result = scoreSorting(data, ['s3', 's2', 's1'])
    // s2 is still at index 1 (correctIndex=1), so 1 correct
    expect(result.correctPositions).toContain(1)
    expect(result.totalCount).toBe(3)
  })

  it('returns partial score for partially correct order', () => {
    const result = scoreSorting(data, ['s1', 's3', 's2'])
    expect(result.score).toBe(33)
    expect(result.correctPositions).toEqual([0])
  })

  it('handles empty items', () => {
    const emptyData: SortingData = { instruction: '', showFeedback: true, items: [] }
    const result = scoreSorting(emptyData, [])
    expect(result.score).toBe(0)
    expect(result.totalCount).toBe(0)
  })
})

// ── scoreFillBlank ───────────────────────────────────────────────

describe('scoreFillBlank', () => {
  const data: FillBlankData = {
    template: 'Ibu kota {{blank_1}} adalah {{blank_2}}',
    showHints: false,
    answers: [
      { id: 'blank_1', acceptedAnswers: ['Indonesia', 'indonesia'], caseSensitive: false },
      { id: 'blank_2', acceptedAnswers: ['Jakarta'], caseSensitive: true },
    ],
  }

  it('returns 100 when all blanks are correct', () => {
    const result = scoreFillBlank(data, { blank_1: 'Indonesia', blank_2: 'Jakarta' })
    expect(result.score).toBe(100)
    expect(result.results.every((r) => r.isCorrect)).toBe(true)
  })

  it('returns 0 when all blanks are wrong', () => {
    const result = scoreFillBlank(data, { blank_1: 'Malaysia', blank_2: 'Surabaya' })
    expect(result.score).toBe(0)
    expect(result.results.every((r) => !r.isCorrect)).toBe(true)
  })

  it('returns partial score for one correct answer', () => {
    const result = scoreFillBlank(data, { blank_1: 'indonesia', blank_2: 'jakarta' })
    // blank_1 should match (case-insensitive), blank_2 should NOT (case-sensitive)
    expect(result.score).toBe(50)
    const b1 = result.results.find((r) => r.id === 'blank_1')
    const b2 = result.results.find((r) => r.id === 'blank_2')
    expect(b1?.isCorrect).toBe(true)
    expect(b2?.isCorrect).toBe(false)
  })

  it('handles case-sensitive matching correctly', () => {
    const result = scoreFillBlank(data, { blank_1: 'INDONESIA', blank_2: 'Jakarta' })
    const b1 = result.results.find((r) => r.id === 'blank_1')
    const b2 = result.results.find((r) => r.id === 'blank_2')
    // blank_1 case-insensitive → match
    expect(b1?.isCorrect).toBe(true)
    // blank_2 case-sensitive → match
    expect(b2?.isCorrect).toBe(true)
  })

  it('trims whitespace from student answers', () => {
    const result = scoreFillBlank(data, { blank_1: '  Indonesia  ', blank_2: 'Jakarta' })
    expect(result.results.find((r) => r.id === 'blank_1')?.isCorrect).toBe(true)
  })

  it('handles empty answers array', () => {
    const emptyData: FillBlankData = { template: 'Teks biasa', showHints: false, answers: [] }
    const result = scoreFillBlank(emptyData, {})
    expect(result.score).toBe(0)
    expect(result.totalCount).toBe(0)
  })
})
