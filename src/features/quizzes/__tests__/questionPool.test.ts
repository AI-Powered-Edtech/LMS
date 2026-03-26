<<<<<<< Updated upstream
import { describe, expect, it } from 'vitest'
=======
import { describe, expect,it } from 'vitest'
>>>>>>> Stashed changes

import {
  getPoolSummary,
  type PoolConfig,
  seededShuffle,
  selectFromPool,
  validatePoolConfig,
} from '../utils/questionPool'

// ─── seededShuffle ───────────────────────────────────────

describe('seededShuffle', () => {
  const items = ['A', 'B', 'C', 'D', 'E']

  it('returns the same length array', () => {
    const result = seededShuffle(items, 'seed-1')
    expect(result).toHaveLength(5)
  })

  it('contains all original items', () => {
    const result = seededShuffle(items, 'seed-1')
    expect(result.sort()).toEqual([...items].sort())
  })

  it('does not mutate the original array', () => {
    const original = [...items]
    seededShuffle(items, 'seed-1')
    expect(items).toEqual(original)
  })

  it('produces deterministic output for the same seed', () => {
    const result1 = seededShuffle(items, 'student-abc')
    const result2 = seededShuffle(items, 'student-abc')
    expect(result1).toEqual(result2)
  })

  it('produces different output for different seeds', () => {
    const result1 = seededShuffle(items, 'seed-1')
    const result2 = seededShuffle(items, 'seed-2')
    // With 5 items, extremely unlikely to be identical with different seeds
    expect(result1).not.toEqual(result2)
  })

  it('handles empty array', () => {
    expect(seededShuffle([], 'seed')).toEqual([])
  })

  it('handles single element', () => {
    expect(seededShuffle(['X'], 'seed')).toEqual(['X'])
  })
})

// ─── selectFromPool ──────────────────────────────────────

describe('selectFromPool', () => {
  const questions = Array.from({ length: 20 }, (_, i) => ({ id: `q${i + 1}` }))

  it('selects poolSize items from total', () => {
    const config: PoolConfig = {
      totalQuestions: 20,
      poolSize: 10,
      shuffleQuestions: true,
      shuffleOptions: false,
    }
    const result = selectFromPool(questions, config, 'attempt-seed')
    expect(result.items).toHaveLength(10)
    expect(result.selectedCount).toBe(10)
    expect(result.totalCount).toBe(20)
    expect(result.isPooled).toBe(true)
  })

  it('returns all items when poolSize is null', () => {
    const config: PoolConfig = {
      totalQuestions: 20,
      poolSize: null,
      shuffleQuestions: false,
      shuffleOptions: false,
    }
    const result = selectFromPool(questions, config, 'seed')
    expect(result.items).toHaveLength(20)
    expect(result.isPooled).toBe(false)
  })

  it('returns all items when poolSize >= total', () => {
    const config: PoolConfig = {
      totalQuestions: 20,
      poolSize: 25,
      shuffleQuestions: false,
      shuffleOptions: false,
    }
    const result = selectFromPool(questions, config, 'seed')
    expect(result.items).toHaveLength(20)
    expect(result.isPooled).toBe(false)
  })

  it('shuffles when shuffleQuestions is true and not pooled', () => {
    const config: PoolConfig = {
      totalQuestions: 20,
      poolSize: null,
      shuffleQuestions: true,
      shuffleOptions: false,
    }
    const result = selectFromPool(questions, config, 'seed-1')
    // Shuffled but all items present
    expect(result.items).toHaveLength(20)
    expect(result.items.sort((a, b) => a.id.localeCompare(b.id))).toEqual(
      questions.sort((a, b) => a.id.localeCompare(b.id))
    )
  })

  it('produces deterministic pool selection with same seed', () => {
    const config: PoolConfig = {
      totalQuestions: 20,
      poolSize: 5,
      shuffleQuestions: true,
      shuffleOptions: false,
    }
    const r1 = selectFromPool(questions, config, 'student-1')
    const r2 = selectFromPool(questions, config, 'student-1')
    expect(r1.items).toEqual(r2.items)
  })

  it('produces different selections for different seeds', () => {
    const config: PoolConfig = {
      totalQuestions: 20,
      poolSize: 5,
      shuffleQuestions: true,
      shuffleOptions: false,
    }
    const r1 = selectFromPool(questions, config, 'student-1')
    const r2 = selectFromPool(questions, config, 'student-2')
    // Different students should generally get different questions
    const ids1 = r1.items.map((i) => i.id)
    const ids2 = r2.items.map((i) => i.id)
    expect(ids1).not.toEqual(ids2)
  })

  it('all selected items exist in original pool', () => {
    const config: PoolConfig = {
      totalQuestions: 20,
      poolSize: 8,
      shuffleQuestions: true,
      shuffleOptions: false,
    }
    const result = selectFromPool(questions, config, 'seed')
    const originalIds = new Set(questions.map((q) => q.id))
    for (const item of result.items) {
      expect(originalIds.has(item.id)).toBe(true)
    }
  })
})

// ─── validatePoolConfig ──────────────────────────────────

describe('validatePoolConfig', () => {
  it('returns null for valid config', () => {
    expect(
      validatePoolConfig({
        totalQuestions: 20,
        poolSize: 10,
        shuffleQuestions: true,
        shuffleOptions: false,
      })
    ).toBeNull()
  })

  it('returns null when poolSize is null', () => {
    expect(
      validatePoolConfig({
        totalQuestions: 20,
        poolSize: null,
        shuffleQuestions: false,
        shuffleOptions: false,
      })
    ).toBeNull()
  })

  it('returns error when poolSize < 1', () => {
    expect(
      validatePoolConfig({
        totalQuestions: 20,
        poolSize: 0,
        shuffleQuestions: false,
        shuffleOptions: false,
      })
    ).toContain('minimal 1')
  })

  it('returns error when poolSize > totalQuestions', () => {
    expect(
      validatePoolConfig({
        totalQuestions: 5,
        poolSize: 10,
        shuffleQuestions: false,
        shuffleOptions: false,
      })
    ).toContain('melebihi')
  })

  it('returns error when totalQuestions < 2 with pooling', () => {
    expect(
      validatePoolConfig({
        totalQuestions: 1,
        poolSize: 1,
        shuffleQuestions: false,
        shuffleOptions: false,
      })
    ).toContain('minimal 2')
  })
})

// ─── getPoolSummary ──────────────────────────────────────

describe('getPoolSummary', () => {
  it('shows "all questions" when no pooling', () => {
    const summary = getPoolSummary({
      totalQuestions: 10,
      poolSize: null,
      shuffleQuestions: false,
      shuffleOptions: false,
    })
    expect(summary).toContain('Semua 10 soal')
  })

  it('shows pool selection summary', () => {
    const summary = getPoolSummary({
      totalQuestions: 20,
      poolSize: 10,
      shuffleQuestions: true,
      shuffleOptions: false,
    })
    expect(summary).toContain('10 dari 20')
    expect(summary).toContain('acak')
  })
})
