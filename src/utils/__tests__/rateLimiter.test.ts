import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  aiTutorRateLimiter,
  createRateLimiter,
  loginRateLimiter,
  messageRateLimiter,
  passwordResetRateLimiter,
  quizSubmitRateLimiter} from "../rateLimiter";

describe("rateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllTimers();
  });

  describe("createRateLimiter", () => {
    it("should allow requests under the limit", () => {
      const limiter = createRateLimiter(3, 1000);
      const result1 = limiter.check("user1");
      expect(result1.allowed).toBe(true);
      expect(result1.remainingAttempts).toBe(2);

      const result2 = limiter.check("user1");
      expect(result2.allowed).toBe(true);
      expect(result2.remainingAttempts).toBe(1);

      const result3 = limiter.check("user1");
      expect(result3.allowed).toBe(true);
      expect(result3.remainingAttempts).toBe(0);
    });

    it("should block requests over the limit and return retryAfterMs", () => {
      const limiter = createRateLimiter(2, 1000);
      limiter.check("user2");
      limiter.check("user2");

      vi.advanceTimersByTime(200); // Advance to have a predictable retryAfterMs

      const blocked = limiter.check("user2");
      expect(blocked.allowed).toBe(false);
      expect(blocked.remainingAttempts).toBe(0);
      expect(blocked.retryAfterMs).toBe(800);
    });

    it("should allow requests again after the window expires", () => {
      const limiter = createRateLimiter(1, 1000);
      limiter.check("user3");

      expect(limiter.check("user3").allowed).toBe(false);

      vi.advanceTimersByTime(1000);

      const allowedAfter = limiter.check("user3");
      expect(allowedAfter.allowed).toBe(true);
      expect(allowedAfter.remainingAttempts).toBe(0);
    });

    it("should reset the limit for a key", () => {
      const limiter = createRateLimiter(1, 1000);
      limiter.check("user4");
      expect(limiter.check("user4").allowed).toBe(false);

      limiter.reset("user4");

      const allowedAfterReset = limiter.check("user4");
      expect(allowedAfterReset.allowed).toBe(true);
      expect(allowedAfterReset.remainingAttempts).toBe(0);
    });

    it("should periodically clean up expired entries", () => {
      const limiter = createRateLimiter(1, 1000);
      limiter.check("user5");

      // cleanup interval is 60_000.
      // This will trigger the setInterval callback in createRateLimiter
      vi.advanceTimersByTime(60_000);

      // The entry should be removed by cleanup, so it's a fresh window.
      // We can test this by checking it.
      const result = limiter.check("user5");
      expect(result.allowed).toBe(true);
    });
  });

  describe("Pre-configured instances", () => {
    it("should have correct pre-configured instances exported", () => {
      expect(loginRateLimiter).toBeDefined();
      expect(quizSubmitRateLimiter).toBeDefined();
      expect(aiTutorRateLimiter).toBeDefined();
      expect(passwordResetRateLimiter).toBeDefined();
      expect(messageRateLimiter).toBeDefined();
    });
  });
});