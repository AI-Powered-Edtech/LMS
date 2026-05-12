import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

import { calculateStreak, computeLevel, computeXPToNextLevel, rankLeaderboard } from '../clientCompute';

describe('clientCompute', () => {
  describe('computeLevel', () => {
    it('returns level 1 for 0 XP', () => {
      expect(computeLevel(0)).toBe(1);
    });

    it('returns correct levels for thresholds', () => {
      expect(computeLevel(100)).toBe(2);
      expect(computeLevel(250)).toBe(3);
      expect(computeLevel(500)).toBe(4);
      expect(computeLevel(1000)).toBe(5);
      expect(computeLevel(2000)).toBe(6);
      expect(computeLevel(3500)).toBe(7);
      expect(computeLevel(5500)).toBe(8);
      expect(computeLevel(8000)).toBe(9);
      expect(computeLevel(12000)).toBe(10);
      expect(computeLevel(15000)).toBe(10); // Above max threshold
    });
  });

  describe('computeXPToNextLevel', () => {
    it('calculates progression for 0 XP (Level 1)', () => {
      expect(computeXPToNextLevel(0)).toEqual({ current: 0, needed: 100, pct: 0 });
    });

    it('calculates progression for 50 XP (Level 1)', () => {
      expect(computeXPToNextLevel(50)).toEqual({ current: 50, needed: 100, pct: 50 });
    });

    it('calculates progression for 100 XP (Level 2)', () => {
      expect(computeXPToNextLevel(100)).toEqual({ current: 0, needed: 150, pct: 0 });
    });

    it('calculates progression for 200 XP (Level 2)', () => {
      // levelMin: 100, levelMax: 250, current: 100, needed: 150
      // pct: 100/150 * 100 = 67%
      expect(computeXPToNextLevel(200)).toEqual({ current: 100, needed: 150, pct: 67 });
    });

    it('calculates max level correctly for 12000 XP', () => {
      expect(computeXPToNextLevel(12000)).toEqual({ current: 0, needed: 0, pct: 100 });
    });

    it('calculates max level correctly for 15000 XP', () => {
      expect(computeXPToNextLevel(15000)).toEqual({ current: 3000, needed: 0, pct: 100 });
    });
  });

  describe('calculateStreak', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-05-12T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns 0 for empty array', () => {
      expect(calculateStreak([])).toEqual({ current: 0, longest: 0 });
    });

    it('returns current 1 and longest 1 for completion today', () => {
      expect(calculateStreak([{ completed_at: '2024-05-12T10:00:00Z' }])).toEqual({ current: 1, longest: 1 });
    });

    it('returns current 1 and longest 1 for completion yesterday', () => {
      expect(calculateStreak([{ completed_at: '2024-05-11T10:00:00Z' }])).toEqual({ current: 1, longest: 1 });
    });

    it('returns current 2 and longest 2 for completions today and yesterday', () => {
      expect(calculateStreak([
        { completed_at: '2024-05-12T10:00:00Z' },
        { completed_at: '2024-05-11T10:00:00Z' }
      ])).toEqual({ current: 2, longest: 2 });
    });

    it('calculates streak broken today, longest is maintained', () => {
      expect(calculateStreak([
        { completed_at: '2024-05-12T10:00:00Z' },
        { completed_at: '2024-05-11T10:00:00Z' },
        // broken streak here
        { completed_at: '2024-05-09T10:00:00Z' },
        { completed_at: '2024-05-08T10:00:00Z' },
        { completed_at: '2024-05-07T10:00:00Z' }
      ])).toEqual({ current: 2, longest: 3 });
    });

    it('returns 0 for current streak if no completion today or yesterday', () => {
      expect(calculateStreak([
        { completed_at: '2024-05-09T10:00:00Z' },
        { completed_at: '2024-05-08T10:00:00Z' }
      ])).toEqual({ current: 0, longest: 2 });
    });
  });

  describe('rankLeaderboard', () => {
    it('sorts by xp descending and assigns ranks', () => {
      const input = [
        { id: '1', total_xp: 100 },
        { id: '2', total_xp: 200 },
        { id: '3', total_xp: 50 }
      ];
      expect(rankLeaderboard(input, 'xp')).toEqual([
        { id: '2', total_xp: 200, rank: 1 },
        { id: '1', total_xp: 100, rank: 2 },
        { id: '3', total_xp: 50, rank: 3 }
      ]);
    });

    it('sorts by streak descending and assigns ranks', () => {
      const input = [
        { id: '1', streak_current: 5 },
        { id: '2', streak_current: 2 },
        { id: '3', streak_current: 10 }
      ];
      expect(rankLeaderboard(input, 'streak')).toEqual([
        { id: '3', streak_current: 10, rank: 1 },
        { id: '1', streak_current: 5, rank: 2 },
        { id: '2', streak_current: 2, rank: 3 }
      ]);
    });

    it('handles missing fields (defaults to 0)', () => {
      const input = [
        { id: '1', total_xp: 100 },
        { id: '2' }
      ];
      expect(rankLeaderboard(input, 'xp')).toEqual([
        { id: '1', total_xp: 100, rank: 1 },
        { id: '2', rank: 2 }
      ]);
    });

    it('handles missing fields when sorting by streak (defaults to 0)', () => {
      const input = [
        { id: '1', streak_current: 5 },
        { id: '2' }
      ];
      expect(rankLeaderboard(input, 'streak')).toEqual([
        { id: '1', streak_current: 5, rank: 1 },
        { id: '2', rank: 2 }
      ]);
    });
  });
});
