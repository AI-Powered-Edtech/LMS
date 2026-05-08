import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

import {
  calculateStreak,
  computeLevel,
  computeXPToNextLevel,
  rankLeaderboard,
} from '../clientCompute';

describe('clientCompute', () => {
  describe('computeLevel', () => {
    it('returns level 1 for 0 XP', () => {
      expect(computeLevel(0)).toBe(1);
    });

    it('returns level 2 for 100 XP', () => {
      expect(computeLevel(100)).toBe(2);
    });

    it('returns level 10 for 12000 XP', () => {
      expect(computeLevel(12000)).toBe(10);
    });

    it('returns level 10 for XP > 12000', () => {
      expect(computeLevel(20000)).toBe(10);
    });
  });

  describe('computeXPToNextLevel', () => {
    it('calculates correct values for 0 XP', () => {
      expect(computeXPToNextLevel(0)).toEqual({ current: 0, needed: 100, pct: 0 });
    });

    it('calculates correct values for 50 XP', () => {
      expect(computeXPToNextLevel(50)).toEqual({ current: 50, needed: 100, pct: 50 });
    });

    it('handles exact threshold level up (100 XP)', () => {
      expect(computeXPToNextLevel(100)).toEqual({ current: 0, needed: 150, pct: 0 });
    });

    it('calculates correct values at level 10 (12000 XP)', () => {
      expect(computeXPToNextLevel(12000)).toEqual({ current: 0, needed: 0, pct: 100 });
    });

    it('calculates correct values beyond level 10 (15000 XP)', () => {
      expect(computeXPToNextLevel(15000)).toEqual({ current: 3000, needed: 0, pct: 100 });
    });
  });

  describe('calculateStreak', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2023-10-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns 0 for empty completions', () => {
      expect(calculateStreak([])).toEqual({ current: 0, longest: 0 });
    });

    it('counts streak for completion today', () => {
      expect(calculateStreak([{ completed_at: '2023-10-15T08:00:00Z' }])).toEqual({
        current: 1,
        longest: 1,
      });
    });

    it('counts streak for completion yesterday', () => {
      expect(calculateStreak([{ completed_at: '2023-10-14T08:00:00Z' }])).toEqual({
        current: 1,
        longest: 1,
      });
    });

    it('resets current streak if most recent completion is older than yesterday', () => {
      expect(calculateStreak([{ completed_at: '2023-10-13T08:00:00Z' }])).toEqual({
        current: 0,
        longest: 1,
      });
    });

    it('calculates streak for consecutive days', () => {
      expect(
        calculateStreak([
          { completed_at: '2023-10-15T12:00:00Z' },
          { completed_at: '2023-10-14T12:00:00Z' },
        ])
      ).toEqual({ current: 2, longest: 2 });
    });

    it('calculates streak correctly with missing days', () => {
      expect(
        calculateStreak([
          { completed_at: '2023-10-15T12:00:00Z' },
          { completed_at: '2023-10-13T12:00:00Z' },
        ])
      ).toEqual({ current: 1, longest: 1 });
    });

    it('calculates longest streak with a past streak broken', () => {
      expect(
        calculateStreak([
          { completed_at: '2023-10-15T12:00:00Z' },
          { completed_at: '2023-10-10T12:00:00Z' },
          { completed_at: '2023-10-09T12:00:00Z' },
          { completed_at: '2023-10-08T12:00:00Z' },
        ])
      ).toEqual({ current: 1, longest: 3 });
    });
  });

  describe('rankLeaderboard', () => {
    it('ranks by xp by default', () => {
      const students = [
        { id: '1', total_xp: 100 },
        { id: '2', total_xp: 200 },
        { id: '3', total_xp: 50 },
      ];
      expect(rankLeaderboard(students)).toEqual([
        { id: '2', total_xp: 200, rank: 1 },
        { id: '1', total_xp: 100, rank: 2 },
        { id: '3', total_xp: 50, rank: 3 },
      ]);
    });

    it('ranks by streak when specified', () => {
      const students = [
        { id: '1', streak_current: 5 },
        { id: '2', streak_current: 10 },
        { id: '3', streak_current: 2 },
      ];
      expect(rankLeaderboard(students, 'streak')).toEqual([
        { id: '2', streak_current: 10, rank: 1 },
        { id: '1', streak_current: 5, rank: 2 },
        { id: '3', streak_current: 2, rank: 3 },
      ]);
    });

    it('handles missing values gracefully', () => {
      const students = [
        { id: '1', total_xp: 100 },
        { id: '2' },
      ];
      expect(rankLeaderboard(students)).toEqual([
        { id: '1', total_xp: 100, rank: 1 },
        { id: '2', rank: 2 },
      ]);
    });
  });
});
