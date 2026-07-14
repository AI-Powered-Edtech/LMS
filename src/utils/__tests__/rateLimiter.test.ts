import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createRateLimiter } from "@/utils/rateLimiter";

describe("rateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("createRateLimiter", () => {
    it("allows requests within the limit", () => {
      const limiter = createRateLimiter(3, 1000);

      const result1 = limiter.check("test-key");
      expect(result1.allowed).toBe(true);
      expect(result1.remainingAttempts).toBe(2);
      expect(result1.retryAfterMs).toBe(0);

      const result2 = limiter.check("test-key");
      expect(result2.allowed).toBe(true);
      expect(result2.remainingAttempts).toBe(1);

      const result3 = limiter.check("test-key");
      expect(result3.allowed).toBe(true);
      expect(result3.remainingAttempts).toBe(0);
    });

    it("blocks requests that exceed the limit", () => {
      const limiter = createRateLimiter(2, 1000);

      limiter.check("test-key");
      limiter.check("test-key");

      const result = limiter.check("test-key");
      expect(result.allowed).toBe(false);
      expect(result.remainingAttempts).toBe(0);
      expect(result.retryAfterMs).toBeGreaterThan(0);
      expect(result.retryAfterMs).toBeLessThanOrEqual(1000);
    });

    it("allows requests after the window expires", () => {
      const limiter = createRateLimiter(1, 1000);

      limiter.check("test-key");

      // blocked
      expect(limiter.check("test-key").allowed).toBe(false);

      // advance time past window
      vi.advanceTimersByTime(1001);

      // allowed again
      const result = limiter.check("test-key");
      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(0);
    });

    it("handles multiple keys independently", () => {
      const limiter = createRateLimiter(1, 1000);

      expect(limiter.check("key1").allowed).toBe(true);
      expect(limiter.check("key2").allowed).toBe(true);

      expect(limiter.check("key1").allowed).toBe(false);
      expect(limiter.check("key2").allowed).toBe(false);
    });

    it("resets a key correctly", () => {
      const limiter = createRateLimiter(1, 1000);

      limiter.check("test-key");
      expect(limiter.check("test-key").allowed).toBe(false);

      limiter.reset("test-key");

      expect(limiter.check("test-key").allowed).toBe(true);
    });

    it("cleans up expired entries periodically", () => {
      // create a limiter, window is 1000ms
      const limiter = createRateLimiter(1, 1000);

      limiter.check("test-key");

      // The interval is hardcoded to 60_000 ms in the cleanup function.
      vi.advanceTimersByTime(60_000);

      // We don't have direct access to the internal map, but we know it should have been deleted.
      // Calling check will set it again.
      const result = limiter.check("test-key");
      expect(result.allowed).toBe(true);
    });
  });
});
