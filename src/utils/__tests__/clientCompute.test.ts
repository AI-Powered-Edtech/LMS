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

    it('returns correct levels for thresholds', () => {
      expect(computeLevel(100)).toBe(2)
      expect(computeLevel(249)).toBe(2)
      expect(computeLevel(250)).toBe(3)
      expect(computeLevel(500)).toBe(4)
      expect(computeLevel(1000)).toBe(5)
      expect(computeLevel(2000)).toBe(6)
      expect(computeLevel(3500)).toBe(7)
      expect(computeLevel(5500)).toBe(8)
      expect(computeLevel(8000)).toBe(9)
    })

    it('returns max level 10 for XP 12000 and above', () => {
      expect(computeLevel(12000)).toBe(10)
      expect(computeLevel(15000)).toBe(10)
    })
  })

  describe('computeXPToNextLevel', () => {
    it('calculates correctly for lower levels', () => {
      const res = computeXPToNextLevel(50)
      expect(res).toEqual({ current: 50, needed: 100, pct: 50 })
    })

    it('calculates correctly at exactly threshold', () => {
      const res = computeXPToNextLevel(250)
      expect(res).toEqual({ current: 0, needed: 250, pct: 0 })
    })

    it('calculates correctly past threshold', () => {
      const res = computeXPToNextLevel(350)
      expect(res).toEqual({ current: 100, needed: 250, pct: 40 })
    })

    it('handles max level exactly', () => {
      const res = computeXPToNextLevel(12000)
      expect(res).toEqual({ current: 0, needed: 0, pct: 100 })
    })

    it('handles max level exceeded', () => {
      const res = computeXPToNextLevel(15000)
      expect(res).toEqual({ current: 3000, needed: 0, pct: 100 })
    })
  })

  describe('calculateStreak', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2023-10-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns 0 for empty array', () => {
      expect(calculateStreak([])).toEqual({ current: 0, longest: 0 })
    })

    it('calculates correctly for single completion today', () => {
      expect(calculateStreak([{ completed_at: '2023-10-15T10:00:00Z' }])).toEqual({
        current: 1,
        longest: 1,
      })
    })

    it('calculates correctly for single completion yesterday', () => {
      expect(calculateStreak([{ completed_at: '2023-10-14T10:00:00Z' }])).toEqual({
        current: 1,
        longest: 1,
      })
    })

    it('returns 0 current streak if last completion is > 1 day ago', () => {
      expect(calculateStreak([{ completed_at: '2023-10-13T10:00:00Z' }])).toEqual({
        current: 0,
        longest: 1,
      })
    })

    it('calculates consecutive days correctly', () => {
      expect(
        calculateStreak([
          { completed_at: '2023-10-15T10:00:00Z' },
          { completed_at: '2023-10-14T10:00:00Z' },
        ])
      ).toEqual({
        current: 2,
        longest: 2,
      })
    })

    it('calculates broken streak correctly', () => {
      expect(
        calculateStreak([
          { completed_at: '2023-10-15T10:00:00Z' },
          { completed_at: '2023-10-13T10:00:00Z' },
          { completed_at: '2023-10-12T10:00:00Z' },
        ])
      ).toEqual({
        current: 1,
        longest: 2,
      })
    })

    it('handles multiple completions on same day', () => {
      expect(
        calculateStreak([
          { completed_at: '2023-10-15T10:00:00Z' },
          { completed_at: '2023-10-15T08:00:00Z' },
        ])
      ).toEqual({
        current: 1,
        longest: 1,
      })
    })
  })

  describe('rankLeaderboard', () => {
    it('sorts by XP by default', () => {
      const students = [
        { id: '1', total_xp: 100, streak_current: 5 },
        { id: '2', total_xp: 200, streak_current: 2 },
        { id: '3', total_xp: 150, streak_current: 10 },
      ]

      const ranked = rankLeaderboard(students)
      expect(ranked[0]).toEqual({ id: '2', total_xp: 200, streak_current: 2, rank: 1 })
      expect(ranked[1]).toEqual({ id: '3', total_xp: 150, streak_current: 10, rank: 2 })
      expect(ranked[2]).toEqual({ id: '1', total_xp: 100, streak_current: 5, rank: 3 })
    })

    it('sorts by streak when specified', () => {
      const students = [
        { id: '1', total_xp: 100, streak_current: 5 },
        { id: '2', total_xp: 200, streak_current: 2 },
        { id: '3', total_xp: 150, streak_current: 10 },
      ]

      const ranked = rankLeaderboard(students, 'streak')
      expect(ranked[0]).toEqual({ id: '3', total_xp: 150, streak_current: 10, rank: 1 })
      expect(ranked[1]).toEqual({ id: '1', total_xp: 100, streak_current: 5, rank: 2 })
      expect(ranked[2]).toEqual({ id: '2', total_xp: 200, streak_current: 2, rank: 3 })
    })

    it('handles missing properties', () => {
      const students = [
        { id: '1' },
        { id: '2', total_xp: 100 },
      ]

      const ranked = rankLeaderboard(students)
      expect(ranked[0]).toEqual({ id: '2', total_xp: 100, rank: 1 })
      expect(ranked[1]).toEqual({ id: '1', rank: 2 })
    })
  })
})
