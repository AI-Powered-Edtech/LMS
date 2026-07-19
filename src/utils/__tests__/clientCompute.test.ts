import { afterEach,beforeEach, describe, expect, it, vi } from "vitest";

import {
  calculateStreak,
  computeLevel,
  computeXPToNextLevel,
  rankLeaderboard,
} from "../clientCompute";

describe("clientCompute", () => {
  describe("computeLevel", () => {
    it("should return correct level based on XP thresholds", () => {
      expect(computeLevel(0)).toBe(1);
      expect(computeLevel(99)).toBe(1);
      expect(computeLevel(100)).toBe(2);
      expect(computeLevel(249)).toBe(2);
      expect(computeLevel(250)).toBe(3);
      expect(computeLevel(11999)).toBe(9);
      expect(computeLevel(12000)).toBe(10);
      expect(computeLevel(20000)).toBe(10);
    });

    it("should handle negative XP gracefully", () => {
      expect(computeLevel(-50)).toBe(1);
    });
  });

  describe("computeXPToNextLevel", () => {
    it("should calculate correctly for level 1", () => {
      expect(computeXPToNextLevel(50)).toEqual({
        current: 50,
        needed: 100,
        pct: 50,
      });
    });

    it("should calculate correctly for higher levels", () => {
      expect(computeXPToNextLevel(150)).toEqual({
        current: 50,
        needed: 150,
        pct: 33,
      });
    });

    it("should handle max level", () => {
      expect(computeXPToNextLevel(15000)).toEqual({
        current: 3000,
        needed: 0,
        pct: 100,
      });
    });

    it("should handle exact threshold", () => {
      expect(computeXPToNextLevel(100)).toEqual({
        current: 0,
        needed: 150,
        pct: 0,
      });
    });
  });

  describe("calculateStreak", () => {
    beforeEach(() => {
      // Mock current date to be consistent for tests
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2023-10-15T12:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const today = "2023-10-15";
    const yesterday = "2023-10-14";
    const twoDaysAgo = "2023-10-13";
    const threeDaysAgo = "2023-10-12";
    const fourDaysAgo = "2023-10-11";

    it("should handle empty array", () => {
      expect(calculateStreak([])).toEqual({ current: 0, longest: 0 });
    });

    it("should calculate current streak ending today", () => {
      expect(
        calculateStreak([
          { completed_at: today },
          { completed_at: yesterday },
          { completed_at: twoDaysAgo },
        ])
      ).toEqual({ current: 3, longest: 3 });
    });

    it("should calculate current streak ending yesterday", () => {
      expect(
        calculateStreak([
          { completed_at: yesterday },
          { completed_at: twoDaysAgo },
        ])
      ).toEqual({ current: 2, longest: 2 });
    });

    it("should return 0 current streak if last completion was > 1 day ago", () => {
      expect(
        calculateStreak([
          { completed_at: twoDaysAgo },
          { completed_at: threeDaysAgo },
        ])
      ).toEqual({ current: 0, longest: 2 });
    });

    it("should calculate longest streak correctly across disconnected streaks", () => {
      expect(
        calculateStreak([
          { completed_at: today },
          { completed_at: twoDaysAgo },
          { completed_at: threeDaysAgo },
          { completed_at: fourDaysAgo },
        ])
      ).toEqual({ current: 1, longest: 3 });
    });

    it("should handle multiple completions on the same day", () => {
      expect(
        calculateStreak([
          { completed_at: `${today}T12:00:00Z` },
          { completed_at: `${today}T15:00:00Z` },
          { completed_at: `${yesterday}T08:00:00Z` },
        ])
      ).toEqual({ current: 2, longest: 2 });
    });
  });

  describe("rankLeaderboard", () => {
    const students = [
      { id: "1", total_xp: 100, streak_current: 5 },
      { id: "2", total_xp: 500, streak_current: 2 },
      { id: "3", total_xp: 50, streak_current: 10 },
    ];

    it("should sort by xp and assign ranks", () => {
      const ranked = rankLeaderboard(students, "xp");
      expect(ranked).toEqual([
        { id: "2", total_xp: 500, streak_current: 2, rank: 1 },
        { id: "1", total_xp: 100, streak_current: 5, rank: 2 },
        { id: "3", total_xp: 50, streak_current: 10, rank: 3 },
      ]);
    });

    it("should sort by streak and assign ranks", () => {
      const ranked = rankLeaderboard(students, "streak");
      expect(ranked).toEqual([
        { id: "3", total_xp: 50, streak_current: 10, rank: 1 },
        { id: "1", total_xp: 100, streak_current: 5, rank: 2 },
        { id: "2", total_xp: 500, streak_current: 2, rank: 3 },
      ]);
    });

    it("should default to sorting by xp", () => {
      const ranked = rankLeaderboard(students);
      expect(ranked[0].id).toBe("2");
      expect(ranked[1].id).toBe("1");
      expect(ranked[2].id).toBe("3");
    });

    it("should handle empty array", () => {
      expect(rankLeaderboard([])).toEqual([]);
    });

    it("should handle undefined properties", () => {
      const missingData = [
        { id: "1", total_xp: 100 },
        { id: "2" },
      ];
      const ranked = rankLeaderboard(missingData, "xp");
      expect(ranked).toEqual([
        { id: "1", total_xp: 100, rank: 1 },
        { id: "2", rank: 2 },
      ]);
    });
  });
});
