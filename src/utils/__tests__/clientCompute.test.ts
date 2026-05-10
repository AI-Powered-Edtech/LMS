import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import {
  computeLevel,
  computeXPToNextLevel,
  calculateStreak,
  rankLeaderboard,
} from '../clientCompute'

describe('clientCompute', () => {
  describe('computeLevel', () => {
    it('calculates the correct level based on XP thresholds', () => {
      expect(computeLevel(0)).toBe(1)
      expect(computeLevel(99)).toBe(1)
      expect(computeLevel(100)).toBe(2)
      expect(computeLevel(250)).toBe(3)
      expect(computeLevel(500)).toBe(4)
      expect(computeLevel(1000)).toBe(5)
      expect(computeLevel(2000)).toBe(6)
      expect(computeLevel(3500)).toBe(7)
      expect(computeLevel(5500)).toBe(8)
      expect(computeLevel(8000)).toBe(9)
      expect(computeLevel(12000)).toBe(10)
      expect(computeLevel(15000)).toBe(10)
    })
  })

  describe('computeXPToNextLevel', () => {
    it('calculates progress correctly for mid-level XP', () => {
      expect(computeXPToNextLevel(50)).toEqual({
        current: 50,
        needed: 100,
        pct: 50,
      })
      expect(computeXPToNextLevel(150)).toEqual({
        current: 50,
        needed: 150,
        pct: 33, // 50/150 * 100 = 33.33 -> 33
      })
    })

    it('handles exact threshold values', () => {
      expect(computeXPToNextLevel(100)).toEqual({
        current: 0,
        needed: 150,
        pct: 0,
      })
    })

    it('caps percentage at 100 and needed at 0 when max level is reached', () => {
      expect(computeXPToNextLevel(12000)).toEqual({
        current: 0,
        needed: 0,
        pct: 100,
      })
      expect(computeXPToNextLevel(12500)).toEqual({
        current: 500,
        needed: 0,
        pct: 100,
      })
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

    it('calculates streak of 1 for a single completion today', () => {
      expect(calculateStreak([{ completed_at: '2023-10-15T08:00:00Z' }])).toEqual({
        current: 1,
        longest: 1,
      })
    })

    it('calculates streak correctly for consecutive days', () => {
      expect(
        calculateStreak([
          { completed_at: '2023-10-15T08:00:00Z' },
          { completed_at: '2023-10-14T08:00:00Z' },
        ])
      ).toEqual({
        current: 2,
        longest: 2,
      })
    })

    it('calculates streak correctly for disconnected days (broken current streak)', () => {
      expect(
        calculateStreak([
          { completed_at: '2023-10-10T08:00:00Z' },
          { completed_at: '2023-10-09T08:00:00Z' },
        ])
      ).toEqual({
        current: 0, // broken streak relative to today
        longest: 2,
      })
    })

    it('calculates streak correctly with multiple completions on the same day', () => {
      expect(
        calculateStreak([
          { completed_at: '2023-10-15T08:00:00Z' },
          { completed_at: '2023-10-15T10:00:00Z' },
          { completed_at: '2023-10-14T08:00:00Z' },
        ])
      ).toEqual({
        current: 2,
        longest: 2,
      })
    })

    it('calculates streak correctly for a recent streak vs a longer past streak', () => {
      expect(
        calculateStreak([
          { completed_at: '2023-10-15T08:00:00Z' }, // today
          { completed_at: '2023-10-14T08:00:00Z' }, // yesterday
          // gap
          { completed_at: '2023-10-05T08:00:00Z' },
          { completed_at: '2023-10-04T08:00:00Z' },
          { completed_at: '2023-10-03T08:00:00Z' },
          { completed_at: '2023-10-02T08:00:00Z' },
        ])
      ).toEqual({
        current: 2,
        longest: 4,
      })
    })
  })

  describe('rankLeaderboard', () => {
    const students = [
      { id: '1', total_xp: 100, streak_current: 5 },
      { id: '2', total_xp: 200, streak_current: 2 },
      { id: '3', total_xp: 150, streak_current: 8 },
    ]

    it('ranks correctly by default (xp)', () => {
      expect(rankLeaderboard(students)).toEqual([
        { id: '2', total_xp: 200, streak_current: 2, rank: 1 },
        { id: '3', total_xp: 150, streak_current: 8, rank: 2 },
        { id: '1', total_xp: 100, streak_current: 5, rank: 3 },
      ])
    })

    it('ranks correctly by xp explicitly', () => {
      expect(rankLeaderboard(students, 'xp')).toEqual([
        { id: '2', total_xp: 200, streak_current: 2, rank: 1 },
        { id: '3', total_xp: 150, streak_current: 8, rank: 2 },
        { id: '1', total_xp: 100, streak_current: 5, rank: 3 },
      ])
    })

    it('ranks correctly by streak', () => {
      expect(rankLeaderboard(students, 'streak')).toEqual([
        { id: '3', total_xp: 150, streak_current: 8, rank: 1 },
        { id: '1', total_xp: 100, streak_current: 5, rank: 2 },
        { id: '2', total_xp: 200, streak_current: 2, rank: 3 },
      ])
    })

    it('handles empty array', () => {
      expect(rankLeaderboard([])).toEqual([])
    })

    it('handles missing values gracefully', () => {
      const studentsWithMissingData = [
        { id: '1' }, // Missing total_xp and streak_current
        { id: '2', total_xp: 10, streak_current: 1 },
      ]
      expect(rankLeaderboard(studentsWithMissingData, 'xp')).toEqual([
        { id: '2', total_xp: 10, streak_current: 1, rank: 1 },
        { id: '1', rank: 2 },
      ])
      expect(rankLeaderboard(studentsWithMissingData, 'streak')).toEqual([
        { id: '2', total_xp: 10, streak_current: 1, rank: 1 },
        { id: '1', rank: 2 },
      ])
    })
  })
})
