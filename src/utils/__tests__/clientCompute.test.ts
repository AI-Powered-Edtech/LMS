import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  computeLevel,
  computeXPToNextLevel,
  calculateStreak,
  rankLeaderboard,
} from "../clientCompute";

describe("clientCompute", () => {
  describe("computeLevel", () => {
    it("returns correct level for given XP", () => {
      expect(computeLevel(0)).toBe(1);
      expect(computeLevel(99)).toBe(1);
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
    it("calculates current, needed, and percentage correctly", () => {
      expect(computeXPToNextLevel(0)).toEqual({
        current: 0,
        needed: 100,
        pct: 0,
      });
      expect(computeXPToNextLevel(50)).toEqual({
        current: 50,
        needed: 100,
        pct: 50,
      });
      expect(computeXPToNextLevel(150)).toEqual({
        current: 50,
        needed: 150,
        pct: 33,
      });
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
      vi.setSystemTime(new Date("2024-05-15T12:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("handles empty completions", () => {
      expect(calculateStreak([])).toEqual({ current: 0, longest: 0 });
    });

    it("calculates streak ending today", () => {
      expect(
        calculateStreak([
          { completed_at: "2024-05-15T10:00:00Z" },
          { completed_at: "2024-05-14T10:00:00Z" },
          { completed_at: "2024-05-13T10:00:00Z" },
        ])
      ).toEqual({ current: 3, longest: 3 });
    });

    it("calculates streak ending yesterday", () => {
      expect(
        calculateStreak([
          { completed_at: "2024-05-14T10:00:00Z" },
          { completed_at: "2024-05-13T10:00:00Z" },
          { completed_at: "2024-05-12T10:00:00Z" },
        ])
      ).toEqual({ current: 3, longest: 3 });
    });

    it("handles broken streak", () => {
      expect(
        calculateStreak([
          { completed_at: "2024-05-15T10:00:00Z" },
          { completed_at: "2024-05-13T10:00:00Z" },
        ])
      ).toEqual({ current: 1, longest: 1 });
    });

    it("calculates historical longest streak", () => {
      expect(
        calculateStreak([
          { completed_at: "2024-05-15T10:00:00Z" },
          { completed_at: "2024-05-05T10:00:00Z" },
          { completed_at: "2024-05-04T10:00:00Z" },
          { completed_at: "2024-05-03T10:00:00Z" },
          { completed_at: "2024-05-02T10:00:00Z" },
        ])
      ).toEqual({ current: 1, longest: 4 });
    });

    it("handles streak ended before yesterday", () => {
      expect(
        calculateStreak([
          { completed_at: "2024-05-13T10:00:00Z" },
          { completed_at: "2024-05-12T10:00:00Z" },
        ])
      ).toEqual({ current: 0, longest: 2 });
    });
  });

  describe("rankLeaderboard", () => {
    it("sorts by xp by default", () => {
      expect(
        rankLeaderboard([
          { id: "1", total_xp: 10 },
          { id: "2", total_xp: 20 },
        ])
      ).toEqual([
        { id: "2", total_xp: 20, rank: 1 },
        { id: "1", total_xp: 10, rank: 2 },
      ]);
    });

    it("sorts by streak when specified", () => {
      expect(
        rankLeaderboard(
          [
            { id: "1", streak_current: 5 },
            { id: "2", streak_current: 1 },
          ],
          "streak"
        )
      ).toEqual([
        { id: "1", streak_current: 5, rank: 1 },
        { id: "2", streak_current: 1, rank: 2 },
      ]);
    });

    it("handles missing values gracefully", () => {
      expect(
        rankLeaderboard([{ id: "1" }, { id: "2", total_xp: 10 }])
      ).toEqual([
        { id: "2", total_xp: 10, rank: 1 },
        { id: "1", rank: 2 },
      ]);
    });
  });
});
