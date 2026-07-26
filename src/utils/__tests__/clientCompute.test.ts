import { afterEach,beforeEach, describe, expect, it, vi } from "vitest";

import {
  calculateStreak,
  computeLevel,
  computeXPToNextLevel,
  rankLeaderboard,
} from "../clientCompute";

describe("clientCompute", () => {
  describe("computeLevel", () => {
    it("returns level 1 for < 100 XP", () => {
      expect(computeLevel(0)).toBe(1);
      expect(computeLevel(99)).toBe(1);
    });

    it("returns level 2 for 100-249 XP", () => {
      expect(computeLevel(100)).toBe(2);
      expect(computeLevel(249)).toBe(2);
    });

    it("returns level 3 for 250-499 XP", () => {
      expect(computeLevel(250)).toBe(3);
    });

    it("returns level 10 for >= 12000 XP", () => {
      expect(computeLevel(12000)).toBe(10);
      expect(computeLevel(15000)).toBe(10);
    });

    it("returns intermediate levels correctly", () => {
      expect(computeLevel(500)).toBe(4);
      expect(computeLevel(1000)).toBe(5);
      expect(computeLevel(2000)).toBe(6);
      expect(computeLevel(3500)).toBe(7);
      expect(computeLevel(5500)).toBe(8);
      expect(computeLevel(8000)).toBe(9);
    });
  });

  describe("computeXPToNextLevel", () => {
    it("computes correct XP details for level 1", () => {
      expect(computeXPToNextLevel(50)).toEqual({
        current: 50,
        needed: 100,
        pct: 50,
      });
    });

    it("computes correct XP details exactly at a threshold", () => {
      expect(computeXPToNextLevel(100)).toEqual({
        current: 0,
        needed: 150,
        pct: 0,
      });
    });

    it("computes correct XP details for max level (>= 12000)", () => {
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

    it("returns 0 for empty completions", () => {
      expect(calculateStreak([])).toEqual({ current: 0, longest: 0 });
    });

    it("computes current streak correctly when active (today)", () => {
      const completions = [
        { completed_at: "2023-10-15T10:00:00Z" },
        { completed_at: "2023-10-14T10:00:00Z" },
        { completed_at: "2023-10-13T10:00:00Z" },
      ];
      expect(calculateStreak(completions)).toEqual({ current: 3, longest: 3 });
    });

    it("computes current streak correctly when active (yesterday)", () => {
      const completions = [
        { completed_at: "2023-10-14T10:00:00Z" },
        { completed_at: "2023-10-13T10:00:00Z" },
      ];
      expect(calculateStreak(completions)).toEqual({ current: 2, longest: 2 });
    });

    it("returns current streak 0 if most recent is older than yesterday", () => {
      const completions = [
        { completed_at: "2023-10-13T10:00:00Z" },
        { completed_at: "2023-10-12T10:00:00Z" },
      ];
      expect(calculateStreak(completions)).toEqual({ current: 0, longest: 2 });
    });

    it("ignores duplicate dates in completions", () => {
      const completions = [
        { completed_at: "2023-10-15T10:00:00Z" },
        { completed_at: "2023-10-15T11:00:00Z" },
        { completed_at: "2023-10-14T10:00:00Z" },
      ];
      expect(calculateStreak(completions)).toEqual({ current: 2, longest: 2 });
    });

    it("computes longest streak across gaps", () => {
      const completions = [
        { completed_at: "2023-10-15T10:00:00Z" },
        { completed_at: "2023-10-14T10:00:00Z" },
        { completed_at: "2023-10-10T10:00:00Z" },
        { completed_at: "2023-10-05T10:00:00Z" },
        { completed_at: "2023-10-04T10:00:00Z" },
        { completed_at: "2023-10-03T10:00:00Z" },
        { completed_at: "2023-10-02T10:00:00Z" },
      ];
      expect(calculateStreak(completions)).toEqual({ current: 2, longest: 4 });
    });
  });

  describe("rankLeaderboard", () => {
    it("ranks by XP in descending order", () => {
      const students = [
        { id: "1", total_xp: 100 },
        { id: "2", total_xp: 300 },
        { id: "3", total_xp: 200 },
        { id: "4" },
      ];
      const ranked = rankLeaderboard(students, "xp");
      expect(ranked).toEqual([
        { id: "2", total_xp: 300, rank: 1 },
        { id: "3", total_xp: 200, rank: 2 },
        { id: "1", total_xp: 100, rank: 3 },
        { id: "4", rank: 4 },
      ]);
    });

    it("ranks by streak in descending order", () => {
      const students = [
        { id: "1", streak_current: 5 },
        { id: "2", streak_current: 1 },
        { id: "3", streak_current: 10 },
      ];
      const ranked = rankLeaderboard(students, "streak");
      expect(ranked).toEqual([
        { id: "3", streak_current: 10, rank: 1 },
        { id: "1", streak_current: 5, rank: 2 },
        { id: "2", streak_current: 1, rank: 3 },
      ]);
    });

    it("handles empty arrays", () => {
      expect(rankLeaderboard([])).toEqual([]);
    });
  });
});
