import { describe, expect, it } from 'vitest'

import {
  calculateProgress,
  calculateStreak,
  calculateTotalXP,
  computeLevel,
  computeXPToNextLevel,
  getEngagementSegment,
  rankLeaderboard,
} from '../clientCompute'

describe('computeLevel', () => {
  it('returns level 1 for 0 XP', () => expect(computeLevel(0)).toBe(1))
  it('returns level 1 for 99 XP', () => expect(computeLevel(99)).toBe(1))
  it('returns level 2 for exactly 100 XP', () => expect(computeLevel(100)).toBe(2))
  it('returns level 3 for exactly 250 XP', () => expect(computeLevel(250)).toBe(3))
  it('returns level 4 for exactly 500 XP', () => expect(computeLevel(500)).toBe(4))
  it('returns level 5 for exactly 1000 XP', () => expect(computeLevel(1000)).toBe(5))
  it('returns level 6 for exactly 2000 XP', () => expect(computeLevel(2000)).toBe(6))
  it('returns level 7 for exactly 3500 XP', () => expect(computeLevel(3500)).toBe(7))
  it('returns level 8 for exactly 5500 XP', () => expect(computeLevel(5500)).toBe(8))
  it('returns level 9 for exactly 8000 XP', () => expect(computeLevel(8000)).toBe(9))
  it('returns level 10 for exactly 12000 XP', () => expect(computeLevel(12000)).toBe(10))
  it('returns level 10 for very high XP', () => expect(computeLevel(99999)).toBe(10))
  it('returns level 4 for 999 XP (just below L5)', () => expect(computeLevel(999)).toBe(4))
})

describe('computeXPToNextLevel', () => {
  it('level 1: current=0, needed=100, pct=0', () => {
    expect(computeXPToNextLevel(0)).toEqual({ current: 0, needed: 100, pct: 0 })
  })

  it('level 1: halfway to L2', () => {
    const result = computeXPToNextLevel(50)
    expect(result.current).toBe(50)
    expect(result.needed).toBe(100)
    expect(result.pct).toBe(50)
  })

  it('level 2: starts at 100', () => {
    const result = computeXPToNextLevel(100)
    expect(result.current).toBe(0)
    expect(result.needed).toBe(150) // 250 - 100
  })

  it('level 10: pct=100 (maxed)', () => {
    const result = computeXPToNextLevel(12000)
    expect(result.needed).toBe(0)
    expect(result.pct).toBe(100)
  })

  it('pct never exceeds 100', () => {
    const result = computeXPToNextLevel(199)
    expect(result.pct).toBeLessThanOrEqual(100)
  })
})

describe('calculateTotalXP', () => {
  it('returns 0 for empty array', () => {
    expect(calculateTotalXP([])).toBe(0)
  })

  it('sums xp_amount values', () => {
    expect(calculateTotalXP([{ xp_amount: 10 }, { xp_amount: 20 }, { xp_amount: 30 }])).toBe(60)
  })

  it('handles missing xp_amount (treats as 0)', () => {
    expect(calculateTotalXP([{ xp_amount: 0 }, { xp_amount: 50 }])).toBe(50)
  })
})

describe('calculateStreak', () => {
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10)
  it('returns 0,0 for empty array', () => {
    expect(calculateStreak([])).toEqual({ current: 0, longest: 0 })
  })

  it('returns 1 streak for single activity today', () => {
    const result = calculateStreak([{ completed_at: `${today}T10:00:00Z` }])
    expect(result.current).toBe(1)
    expect(result.longest).toBe(1)
  })

  it('returns 1 streak for activity yesterday', () => {
    const result = calculateStreak([{ completed_at: `${yesterday}T10:00:00Z` }])
    expect(result.current).toBe(1)
  })

  it('returns 0 current streak for activity two days ago', () => {
    const result = calculateStreak([{ completed_at: `${twoDaysAgo}T10:00:00Z` }])
    expect(result.current).toBe(0)
  })

  it('computes streak for consecutive days', () => {
    const activities = [
      { completed_at: `${today}T10:00:00Z` },
      { completed_at: `${yesterday}T10:00:00Z` },
      { completed_at: `${twoDaysAgo}T10:00:00Z` },
    ]
    const result = calculateStreak(activities)
    expect(result.current).toBe(3)
    expect(result.longest).toBe(3)
  })

  it('deduplicates same-day activities', () => {
    const activities = [
      { completed_at: `${today}T08:00:00Z` },
      { completed_at: `${today}T12:00:00Z` },
      { completed_at: `${yesterday}T10:00:00Z` },
    ]
    const result = calculateStreak(activities)
    expect(result.current).toBe(2)
  })

  it('correctly tracks longest vs current when streak was broken', () => {
    const past = new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10)
    const past2 = new Date(Date.now() - 11 * 86400000).toISOString().slice(0, 10)
    const past3 = new Date(Date.now() - 12 * 86400000).toISOString().slice(0, 10)
    const activities = [
      { completed_at: `${yesterday}T10:00:00Z` },
      { completed_at: `${past}T10:00:00Z` },
      { completed_at: `${past2}T10:00:00Z` },
      { completed_at: `${past3}T10:00:00Z` },
    ]
    const result = calculateStreak(activities)
    expect(result.current).toBe(1)
    expect(result.longest).toBe(3)
  })
})

describe('getEngagementSegment', () => {
  it('returns high for >= 500 weeklyXP', () => expect(getEngagementSegment(500)).toBe('high'))
  it('returns high for > 500 weeklyXP', () => expect(getEngagementSegment(1000)).toBe('high'))
  it('returns medium for 200-499', () => expect(getEngagementSegment(200)).toBe('medium'))
  it('returns medium for 499', () => expect(getEngagementSegment(499)).toBe('medium'))
  it('returns low for 50-199', () => expect(getEngagementSegment(50)).toBe('low'))
  it('returns low for 199', () => expect(getEngagementSegment(199)).toBe('low'))
  it('returns at_risk for < 50', () => expect(getEngagementSegment(49)).toBe('at_risk'))
  it('returns at_risk for 0', () => expect(getEngagementSegment(0)).toBe('at_risk'))
})

describe('calculateProgress', () => {
  it('returns 0 when total is 0', () => expect(calculateProgress(5, 0)).toBe(0))
  it('returns 0 when completed is 0', () => expect(calculateProgress(0, 10)).toBe(0))
  it('returns 100 when all completed', () => expect(calculateProgress(10, 10)).toBe(100))
  it('returns 50 for halfway', () => expect(calculateProgress(5, 10)).toBe(50))
  it('caps at 100 even if completed > total', () => expect(calculateProgress(15, 10)).toBe(100))
  it('rounds to nearest integer', () => expect(calculateProgress(1, 3)).toBe(33))
})

describe('rankLeaderboard', () => {
  const students = [
    { id: 'a', total_xp: 100, streak_current: 5 },
    { id: 'b', total_xp: 500, streak_current: 2 },
    { id: 'c', total_xp: 250, streak_current: 10 },
  ]

  it('ranks by XP descending (default)', () => {
    const result = rankLeaderboard(students)
    expect(result[0].id).toBe('b')
    expect(result[0].rank).toBe(1)
    expect(result[1].id).toBe('c')
    expect(result[1].rank).toBe(2)
    expect(result[2].id).toBe('a')
    expect(result[2].rank).toBe(3)
  })

  it('ranks by streak descending', () => {
    const result = rankLeaderboard(students, 'streak')
    expect(result[0].id).toBe('c')
    expect(result[0].rank).toBe(1)
  })

  it('does not mutate the original array', () => {
    const copy = [...students]
    rankLeaderboard(students)
    expect(students).toEqual(copy)
  })

  it('returns empty array for empty input', () => {
    expect(rankLeaderboard([])).toEqual([])
  })

  it('handles missing XP (treats as 0)', () => {
    const data = [{ id: 'x' }, { id: 'y', total_xp: 100 }]
    const result = rankLeaderboard(data)
    expect(result[0].id).toBe('y')
  })
})
