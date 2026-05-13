import { afterEach, beforeEach,describe, expect, it, vi } from "vitest";

import {
  calculateStreak,
  computeLevel,
  computeXPToNextLevel,
  rankLeaderboard,
} from "../clientCompute";

describe("clientCompute", () => {
  describe("computeLevel", () => {
    it("should compute correct levels based on XP thresholds", () => {
      expect(computeLevel(0)).toBe(1);
      expect(computeLevel(50)).toBe(1);
      expect(computeLevel(100)).toBe(2);
      expect(computeLevel(250)).toBe(3);
      expect(computeLevel(500)).toBe(4);
      expect(computeLevel(1000)).toBe(5);
      expect(computeLevel(2000)).toBe(6);
      expect(computeLevel(3500)).toBe(7);
      expect(computeLevel(5500)).toBe(8);
      expect(computeLevel(8000)).toBe(9);
      expect(computeLevel(12000)).toBe(10);
      expect(computeLevel(15000)).toBe(10);
    });
  });

  describe("computeXPToNextLevel", () => {
    it("should compute current, needed, and pct for early levels", () => {
      expect(computeXPToNextLevel(50)).toEqual({
        current: 50,
        needed: 100,
        pct: 50,
      });

      expect(computeXPToNextLevel(150)).toEqual({
        current: 50, // 150 - 100
        needed: 150, // 250 - 100
        pct: 33, // 50 / 150 = 33.33%
      });
    });

    it("should cap at level 10 (max level)", () => {
      expect(computeXPToNextLevel(12000)).toEqual({
        current: 0,
        needed: 0,
        pct: 100,
      });

      expect(computeXPToNextLevel(15000)).toEqual({
        current: 3000,
        needed: 0,
        pct: 100,
      });
    });
  });

  describe("calculateStreak", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2023-10-15T12:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should return 0 for both if completions array is empty", () => {
      expect(calculateStreak([])).toEqual({ current: 0, longest: 0 });
    });

    it("should return streak 1 if only completed today", () => {
      const completions = [{ completed_at: "2023-10-15T10:00:00Z" }];
      expect(calculateStreak(completions)).toEqual({ current: 1, longest: 1 });
    });

    it("should maintain streak if completed yesterday", () => {
      const completions = [{ completed_at: "2023-10-14T10:00:00Z" }];
      expect(calculateStreak(completions)).toEqual({ current: 1, longest: 1 });
    });

    it("should break current streak if most recent completion is before yesterday", () => {
      const completions = [
        { completed_at: "2023-10-13T10:00:00Z" },
        { completed_at: "2023-10-12T10:00:00Z" },
      ];
      expect(calculateStreak(completions)).toEqual({ current: 0, longest: 2 });
    });

    it("should calculate correct current and longest streak with gaps", () => {
      const completions = [
        { completed_at: "2023-10-15T10:00:00Z" }, // streak 1
        { completed_at: "2023-10-14T10:00:00Z" }, // streak 2
        // gap
        { completed_at: "2023-10-10T10:00:00Z" }, // longest run starts here
        { completed_at: "2023-10-09T10:00:00Z" },
        { completed_at: "2023-10-08T10:00:00Z" }, // longest run 3
      ];
      expect(calculateStreak(completions)).toEqual({ current: 2, longest: 3 });
    });

    it("should handle duplicate dates properly", () => {
      const completions = [
        { completed_at: "2023-10-15T10:00:00Z" },
        { completed_at: "2023-10-15T08:00:00Z" },
        { completed_at: "2023-10-14T10:00:00Z" },
      ];
      expect(calculateStreak(completions)).toEqual({ current: 2, longest: 2 });
    });
  });

  describe("rankLeaderboard", () => {
    it("should rank students by total_xp by default", () => {
      const students = [
        { id: "1", total_xp: 100 },
        { id: "2", total_xp: 200 },
        { id: "3", total_xp: 50 },
      ];
      const ranked = rankLeaderboard(students);
      expect(ranked).toEqual([
        { id: "2", total_xp: 200, rank: 1 },
        { id: "1", total_xp: 100, rank: 2 },
        { id: "3", total_xp: 50, rank: 3 },
      ]);
    });

    it("should rank students by streak_current if sortBy is streak", () => {
      const students = [
        { id: "1", total_xp: 500, streak_current: 2 },
        { id: "2", total_xp: 100, streak_current: 5 },
      ];
      const ranked = rankLeaderboard(students, "streak");
      expect(ranked).toEqual([
        { id: "2", total_xp: 100, streak_current: 5, rank: 1 },
        { id: "1", total_xp: 500, streak_current: 2, rank: 2 },
      ]);
    });

    it("should handle missing properties gracefully", () => {
      const students = [
        { id: "1" },
        { id: "2", total_xp: 10 },
      ];
      const ranked = rankLeaderboard(students);
      expect(ranked).toEqual([
        { id: "2", total_xp: 10, rank: 1 },
        { id: "1", rank: 2 }, // defaults to 0
      ]);
    });
  });
});
