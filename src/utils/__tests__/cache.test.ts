import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  cachedQuery,
  CacheKeys,
  clearCache,
  getCached,
  invalidateCourseCache,
  invalidateUserCache,
  setCache,
} from "../cache";

import { logger } from "@/utils/logger";

describe("cache", () => {
  const mockNow = 1600000000000;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockNow);
    localStorage.clear();
    vi.spyOn(logger, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("getCached", () => {
    it("returns null if item not in cache", () => {
      expect(getCached("missing")).toBeNull();
    });

    it("returns data if item is fresh", () => {
      const entry = {
        data: { foo: "bar" },
        timestamp: mockNow - 1000,
        ttlMinutes: 1,
      };
      localStorage.setItem("edusync_cache_test", JSON.stringify(entry));
      expect(getCached("test")).toEqual({ foo: "bar" });
    });

    it("returns null and removes item if it is expired", () => {
      const entry = {
        data: { foo: "bar" },
        timestamp: mockNow - 61000,
        ttlMinutes: 1,
      };
      localStorage.setItem("edusync_cache_test", JSON.stringify(entry));
      expect(getCached("test")).toBeNull();
      expect(localStorage.getItem("edusync_cache_test")).toBeNull();
    });

    it("returns null if JSON parsing fails", () => {
      localStorage.setItem("edusync_cache_test", "invalid json");
      expect(getCached("test")).toBeNull();
    });
  });

  describe("setCache", () => {
    it("saves data to localStorage", () => {
      setCache("test", { a: 1 }, 10);
      const item = localStorage.getItem("edusync_cache_test");
      expect(item).not.toBeNull();
      const parsed = JSON.parse(item!);
      expect(parsed.data).toEqual({ a: 1 });
      expect(parsed.timestamp).toBe(mockNow);
      expect(parsed.ttlMinutes).toBe(10);
    });

    it("clears cache and retries if localStorage throws QuotaExceededError", () => {
      // Mock localStorage.setItem to throw once, then succeed
      let count = 0;
      const originalSetItem = localStorage.setItem.bind(localStorage);
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(
        (key, value) => {
          if (count === 0) {
            count++;
            throw new Error("QuotaExceededError");
          }
          originalSetItem(key, value);
        },
      );
      // Add something to cache that should be cleared
      originalSetItem("edusync_cache_old", "stuff");

      setCache("test", { b: 2 }, 5);

      expect(localStorage.getItem("edusync_cache_old")).toBeNull(); // it should have cleared
      const item = localStorage.getItem("edusync_cache_test");
      expect(item).not.toBeNull();
      const parsed = JSON.parse(item!);
      expect(parsed.data).toEqual({ b: 2 });
    });
  });

  describe("clearCache", () => {
    it("clears all keys starting with CACHE_PREFIX when no prefix given", () => {
      localStorage.setItem("edusync_cache_a", "1");
      localStorage.setItem("edusync_cache_b", "2");
      localStorage.setItem("other_key", "3");

      clearCache();

      expect(localStorage.getItem("edusync_cache_a")).toBeNull();
      expect(localStorage.getItem("edusync_cache_b")).toBeNull();
      expect(localStorage.getItem("other_key")).toBe("3");
    });

    it("clears only keys starting with CACHE_PREFIX + prefix", () => {
      localStorage.setItem("edusync_cache_xp_user1", "1");
      localStorage.setItem("edusync_cache_xp_user2", "2");
      localStorage.setItem("edusync_cache_badges_user1", "3");

      clearCache("xp_");

      expect(localStorage.getItem("edusync_cache_xp_user1")).toBeNull();
      expect(localStorage.getItem("edusync_cache_xp_user2")).toBeNull();
      expect(localStorage.getItem("edusync_cache_badges_user1")).toBe("3");
    });
  });

  describe("cachedQuery", () => {
    it("returns cached data if fresh", async () => {
      const queryFn = vi.fn();
      localStorage.setItem(
        "edusync_cache_qtest",
        JSON.stringify({
          data: "cached_data",
          timestamp: mockNow,
          ttlMinutes: 10,
        }),
      );

      const result = await cachedQuery("qtest", queryFn);
      expect(result).toBe("cached_data");
      expect(queryFn).not.toHaveBeenCalled();
    });

    it("calls queryFn and caches result if not cached", async () => {
      const queryFn = vi.fn().mockResolvedValue("new_data");

      const result = await cachedQuery("qtest", queryFn, 20);
      expect(result).toBe("new_data");
      expect(queryFn).toHaveBeenCalledOnce();

      const item = localStorage.getItem("edusync_cache_qtest");
      expect(item).not.toBeNull();
      const parsed = JSON.parse(item!);
      expect(parsed.data).toBe("new_data");
      expect(parsed.ttlMinutes).toBe(20);
    });

    it("removes cache entry and throws if queryFn throws", async () => {
      localStorage.setItem("edusync_cache_qerror", "corrupted");
      const error = new Error("Query failed");
      const queryFn = vi.fn().mockRejectedValue(error);

      await expect(cachedQuery("qerror", queryFn)).rejects.toThrow(error);

      expect(localStorage.getItem("edusync_cache_qerror")).toBeNull();
    });
  });

  describe("CacheKeys", () => {
    it("generates correct keys", () => {
      expect(CacheKeys.xpProfile("u1")).toBe("xp_u1");
      expect(CacheKeys.badges("u2")).toBe("badges_u2");
      expect(CacheKeys.leaderboard("c1", "week")).toBe("lb_c1_week");
      expect(CacheKeys.teacherAnalytics("c2")).toBe("analytics_c2");
      expect(CacheKeys.courseCatalog("t1")).toBe("catalog_t1");
      expect(CacheKeys.classOverview("cls1")).toBe("class_cls1");
      expect(CacheKeys.progress("u1", "c1")).toBe("progress_u1_c1");
    });
  });

  describe("invalidation helpers", () => {
    it("invalidateUserCache clears user specific caches", () => {
      localStorage.setItem("edusync_cache_xp_u1", "1");
      localStorage.setItem("edusync_cache_badges_u1", "2");
      localStorage.setItem("edusync_cache_progress_u1", "3");
      localStorage.setItem("edusync_cache_xp_u2", "4");

      invalidateUserCache("u1");

      expect(localStorage.getItem("edusync_cache_xp_u1")).toBeNull();
      expect(localStorage.getItem("edusync_cache_badges_u1")).toBeNull();
      expect(localStorage.getItem("edusync_cache_progress_u1")).toBeNull();
      expect(localStorage.getItem("edusync_cache_xp_u2")).toBe("4");
    });

    it("invalidateCourseCache clears course specific caches", () => {
      localStorage.setItem("edusync_cache_analytics_c1", "1");
      localStorage.setItem("edusync_cache_lb_c1", "2");
      localStorage.setItem("edusync_cache_class_c1", "3");
      localStorage.setItem("edusync_cache_analytics_c2", "4");

      invalidateCourseCache("c1");

      expect(localStorage.getItem("edusync_cache_analytics_c1")).toBeNull();
      expect(localStorage.getItem("edusync_cache_lb_c1")).toBeNull();
      expect(localStorage.getItem("edusync_cache_class_c1")).toBeNull();
      expect(localStorage.getItem("edusync_cache_analytics_c2")).toBe("4");
    });
  });
});
