import { afterEach, beforeEach,describe, expect, it, vi } from 'vitest'

import {
  calculateStreak,
  computeLevel,
  computeXPToNextLevel,
  rankLeaderboard,
} from '../clientCompute'

describe('clientCompute', () => {
  describe('computeLevel', () => {
    it('returns level 1 for 0 XP', () => {
      expect(computeLevel(0)).toBe(1)
    })
    it('returns level 2 for 100 XP', () => {
      expect(computeLevel(100)).toBe(2)
    })
    it('returns level 3 for 250 XP', () => {
      expect(computeLevel(250)).toBe(3)
    })
    it('returns level 4 for 500 XP', () => {
      expect(computeLevel(500)).toBe(4)
    })
    it('returns level 5 for 1000 XP', () => {
      expect(computeLevel(1000)).toBe(5)
    })
    it('returns level 6 for 2000 XP', () => {
      expect(computeLevel(2000)).toBe(6)
    })
    it('returns level 7 for 3500 XP', () => {
      expect(computeLevel(3500)).toBe(7)
    })
    it('returns level 8 for 5500 XP', () => {
      expect(computeLevel(5500)).toBe(8)
    })
    it('returns level 9 for 8000 XP', () => {
      expect(computeLevel(8000)).toBe(9)
    })
    it('returns level 10 for 12000 XP', () => {
      expect(computeLevel(12000)).toBe(10)
    })
    it('returns level 10 for 15000 XP', () => {
      expect(computeLevel(15000)).toBe(10)
    })
  })

  describe('computeXPToNextLevel', () => {
    it('returns correct XP needed for level 1 (0 to 100 XP)', () => {
      expect(computeXPToNextLevel(50)).toEqual({ current: 50, needed: 100, pct: 50 })
    })

    it('returns correct XP needed for level 10 (12000+ XP)', () => {
      expect(computeXPToNextLevel(12000)).toEqual({ current: 0, needed: 0, pct: 100 })
    })

    it('returns correct XP needed precisely on threshold for level 3', () => {
      expect(computeXPToNextLevel(250)).toEqual({ current: 0, needed: 250, pct: 0 })
    })

    it('returns correct pct for arbitrary values', () => {
      expect(computeXPToNextLevel(150)).toEqual({ current: 50, needed: 150, pct: 33 })
    })
  })

  describe('calculateStreak', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-10T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns 0 for empty array', () => {
      expect(calculateStreak([])).toEqual({ current: 0, longest: 0 })
    })

    it('returns current and longest streak for consecutive days ending today', () => {
      const completions = [
        { completed_at: '2024-01-10T00:00:00Z' },
        { completed_at: '2024-01-09T00:00:00Z' },
        { completed_at: '2024-01-08T00:00:00Z' },
      ]
      expect(calculateStreak(completions)).toEqual({ current: 3, longest: 3 })
    })

    it('returns current 0 but correct longest for non-consecutive past days', () => {
      const completions = [
        { completed_at: '2024-01-05T00:00:00Z' },
        { completed_at: '2024-01-04T00:00:00Z' },
        { completed_at: '2024-01-02T00:00:00Z' },
      ]
      expect(calculateStreak(completions)).toEqual({ current: 0, longest: 2 })
    })

    it('maintains current streak if last completion was yesterday', () => {
      const completions = [
        { completed_at: '2024-01-09T00:00:00Z' },
        { completed_at: '2024-01-08T00:00:00Z' },
      ]
      expect(calculateStreak(completions)).toEqual({ current: 2, longest: 2 })
    })

    it('handles multiple same-day completions correctly', () => {
      const completions = [
        { completed_at: '2024-01-10T10:00:00Z' },
        { completed_at: '2024-01-10T08:00:00Z' },
        { completed_at: '2024-01-09T00:00:00Z' },
      ]
      expect(calculateStreak(completions)).toEqual({ current: 2, longest: 2 })
    })

    it('breaks current streak and calculates longest streak correctly', () => {
      const completions = [
        { completed_at: '2024-01-10T00:00:00Z' },
        { completed_at: '2024-01-09T00:00:00Z' },
        { completed_at: '2024-01-05T00:00:00Z' },
        { completed_at: '2024-01-04T00:00:00Z' },
        { completed_at: '2024-01-03T00:00:00Z' },
      ]
      expect(calculateStreak(completions)).toEqual({ current: 2, longest: 3 })
    })
  })

  describe('rankLeaderboard', () => {
    it('ranks correctly by xp (default)', () => {
      const students = [
        { id: '1', total_xp: 100 },
        { id: '2', total_xp: 200 },
        { id: '3', total_xp: 50 },
      ]
      expect(rankLeaderboard(students)).toEqual([
        { id: '2', total_xp: 200, rank: 1 },
        { id: '1', total_xp: 100, rank: 2 },
        { id: '3', total_xp: 50, rank: 3 },
      ])
    })

    it('ranks correctly by streak', () => {
      const students = [
        { id: '1', streak_current: 5 },
        { id: '2', streak_current: 10 },
        { id: '3', streak_current: 2 },
      ]
      expect(rankLeaderboard(students, 'streak')).toEqual([
        { id: '2', streak_current: 10, rank: 1 },
        { id: '1', streak_current: 5, rank: 2 },
        { id: '3', streak_current: 2, rank: 3 },
      ])
    })

    it('handles missing properties', () => {
      const students = [
        { id: '1' },
        { id: '2', total_xp: 50 },
      ]
      expect(rankLeaderboard(students)).toEqual([
        { id: '2', total_xp: 50, rank: 1 },
        { id: '1', rank: 2 },
      ])
    })
  })
})