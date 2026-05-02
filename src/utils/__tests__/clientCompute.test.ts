import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest'

import {
  calculateStreak,
  computeLevel,
  computeXPToNextLevel,
  rankLeaderboard,
} from '../clientCompute'

describe('clientCompute', () => {
  describe('computeLevel', () => {
    it('returns level 1 for XP under 100', () => {
      expect(computeLevel(0)).toBe(1)
      expect(computeLevel(99)).toBe(1)
    })

    it('returns correct levels based on thresholds', () => {
      expect(computeLevel(100)).toBe(2)
      expect(computeLevel(249)).toBe(2)
      expect(computeLevel(250)).toBe(3)
      expect(computeLevel(500)).toBe(4)
      expect(computeLevel(1000)).toBe(5)
      expect(computeLevel(2000)).toBe(6)
      expect(computeLevel(3500)).toBe(7)
      expect(computeLevel(5500)).toBe(8)
      expect(computeLevel(8000)).toBe(9)
      expect(computeLevel(11999)).toBe(9)
    })

    it('returns level 10 for XP at or above 12000', () => {
      expect(computeLevel(12000)).toBe(10)
      expect(computeLevel(15000)).toBe(10)
    })
  })

  describe('computeXPToNextLevel', () => {
    it('calculates correctly for level 1 (0 to 100)', () => {
      expect(computeXPToNextLevel(0)).toEqual({ current: 0, needed: 100, pct: 0 })
      expect(computeXPToNextLevel(50)).toEqual({ current: 50, needed: 100, pct: 50 })
    })

    it('calculates correctly for intermediate levels', () => {
      // Level 2: 100 to 250 (needed = 150)
      expect(computeXPToNextLevel(150)).toEqual({ current: 50, needed: 150, pct: 33 })
      // Level 3: 250 to 500 (needed = 250)
      expect(computeXPToNextLevel(250)).toEqual({ current: 0, needed: 250, pct: 0 })
      // Level 5: 1000 to 2000 (needed = 1000)
      expect(computeXPToNextLevel(1500)).toEqual({ current: 500, needed: 1000, pct: 50 })
    })

    it('handles max level (12000+ XP)', () => {
      expect(computeXPToNextLevel(12000)).toEqual({ current: 0, needed: 0, pct: 100 })
      expect(computeXPToNextLevel(15000)).toEqual({ current: 3000, needed: 0, pct: 100 })
    })
  })

  describe('calculateStreak', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      // Set system time to 2023-10-15T12:00:00Z for consistent relative dates
      vi.setSystemTime(new Date('2023-10-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns 0 for both current and longest if no completions', () => {
      expect(calculateStreak([])).toEqual({ current: 0, longest: 0 })
    })

    it('calculates streak for completion today', () => {
      expect(calculateStreak([{ completed_at: '2023-10-15T08:00:00Z' }])).toEqual({ current: 1, longest: 1 })
    })

    it('calculates streak for completion yesterday', () => {
      expect(calculateStreak([{ completed_at: '2023-10-14T08:00:00Z' }])).toEqual({ current: 1, longest: 1 })
    })

    it('returns current streak 0 if most recent completion is older than yesterday', () => {
      expect(calculateStreak([{ completed_at: '2023-10-13T08:00:00Z' }])).toEqual({ current: 0, longest: 1 })
    })

    it('calculates consecutive days correctly for current streak', () => {
      const completions = [
        { completed_at: '2023-10-15T08:00:00Z' }, // today
        { completed_at: '2023-10-14T08:00:00Z' }, // yesterday
        { completed_at: '2023-10-13T08:00:00Z' }, // 2 days ago
      ]
      expect(calculateStreak(completions)).toEqual({ current: 3, longest: 3 })
    })

    it('handles out-of-order dates and duplicate dates', () => {
      const completions = [
        { completed_at: '2023-10-13T08:00:00Z' },
        { completed_at: '2023-10-15T08:00:00Z' }, // today
        { completed_at: '2023-10-14T10:00:00Z' }, // yesterday
        { completed_at: '2023-10-14T08:00:00Z' }, // duplicate yesterday
      ]
      expect(calculateStreak(completions)).toEqual({ current: 3, longest: 3 })
    })

    it('calculates longest streak correctly even when current is broken', () => {
      const completions = [
        { completed_at: '2023-10-15T08:00:00Z' }, // today (current streak 1)
        // 14th missing
        { completed_at: '2023-10-10T08:00:00Z' },
        { completed_at: '2023-10-09T08:00:00Z' },
        { completed_at: '2023-10-08T08:00:00Z' },
        { completed_at: '2023-10-07T08:00:00Z' }, // 4 day streak in past
      ]
      expect(calculateStreak(completions)).toEqual({ current: 1, longest: 4 })
    })

    it('stops current streak counting when gap is encountered', () => {
      const completions = [
        { completed_at: '2023-10-14T08:00:00Z' }, // yesterday
        { completed_at: '2023-10-13T08:00:00Z' }, // 2 days ago
        // gap
        { completed_at: '2023-10-11T08:00:00Z' },
        { completed_at: '2023-10-10T08:00:00Z' },
      ]
      expect(calculateStreak(completions)).toEqual({ current: 2, longest: 2 })
    })
  })

  describe('rankLeaderboard', () => {
    const students = [
      { id: '1', total_xp: 100, streak_current: 2 },
      { id: '2', total_xp: 300, streak_current: 1 },
      { id: '3', total_xp: 200, streak_current: 5 },
      { id: '4' }, // missing both
    ]

    it('handles empty arrays', () => {
      expect(rankLeaderboard([])).toEqual([])
    })

    it('sorts by xp by default and assigns rank', () => {
      const ranked = rankLeaderboard(students)
      expect(ranked).toEqual([
        { id: '2', total_xp: 300, streak_current: 1, rank: 1 },
        { id: '3', total_xp: 200, streak_current: 5, rank: 2 },
        { id: '1', total_xp: 100, streak_current: 2, rank: 3 },
        { id: '4', rank: 4 }, // 0 XP
      ])
    })

    it('sorts by streak when specified and assigns rank', () => {
      const ranked = rankLeaderboard(students, 'streak')
      expect(ranked).toEqual([
        { id: '3', total_xp: 200, streak_current: 5, rank: 1 },
        { id: '1', total_xp: 100, streak_current: 2, rank: 2 },
        { id: '2', total_xp: 300, streak_current: 1, rank: 3 },
        { id: '4', rank: 4 }, // 0 streak
      ])
    })
  })
})
