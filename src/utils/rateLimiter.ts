/**
 * Frontend Rate Limiter
 *
 * In-memory, per-key rate limiter with sliding window and automatic TTL cleanup.
 * This is a client-side defense-in-depth measure — real rate limiting must
 * also exist server-side (RLS / API middleware).
 */

interface RateLimitEntry {
  attempts: number;
  windowStart: number;
}

interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterMs: number;
}

interface RateLimiter {
  /** Check whether the given key is allowed to proceed. */
  check(key: string): RateLimitResult;
  /** Reset the counter for a specific key (e.g. after successful action). */
  reset(key: string): void;
}

/**
 * Create a rate limiter instance.
 *
 * @param maxAttempts  Maximum attempts allowed within the window
 * @param windowMs    Window duration in milliseconds
 */
export function createRateLimiter(
  maxAttempts: number,
  windowMs: number,
): RateLimiter {
  const store = new Map<string, RateLimitEntry>();

  // Periodic cleanup of expired entries (every 60 s)
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now - entry.windowStart >= windowMs) {
        store.delete(key);
      }
    }
  }, 60_000);

  // Allow GC to reclaim the interval if the limiter is no longer referenced
  if (typeof cleanupInterval === "object" && "unref" in cleanupInterval) {
    (cleanupInterval as NodeJS.Timeout).unref();
  }

  function check(key: string): RateLimitResult {
    const now = Date.now();
    const entry = store.get(key);

    // No existing entry or window has expired — allow and start a fresh window
    if (!entry || now - entry.windowStart >= windowMs) {
      store.set(key, { attempts: 1, windowStart: now });
      return {
        allowed: true,
        remainingAttempts: maxAttempts - 1,
        retryAfterMs: 0,
      };
    }

    // Within the window and still under the limit
    if (entry.attempts < maxAttempts) {
      entry.attempts += 1;
      return {
        allowed: true,
        remainingAttempts: maxAttempts - entry.attempts,
        retryAfterMs: 0,
      };
    }

    // Rate limited
    const retryAfterMs = windowMs - (now - entry.windowStart);
    return { allowed: false, remainingAttempts: 0, retryAfterMs };
  }

  function reset(key: string): void {
    store.delete(key);
  }

  return { check, reset };
}

// ── Pre-configured instances ─────────────────────────────────────────────

/** Login: 5 attempts per 60 seconds */
export const loginRateLimiter = createRateLimiter(5, 60_000);

/** Quiz submission: 1 attempt per session (large window) */
export const quizSubmitRateLimiter = createRateLimiter(1, 3_600_000);

/** AI Tutor: 10 requests per 60 seconds */
export const aiTutorRateLimiter = createRateLimiter(10, 60_000);

/** Password reset: 3 attempts per 10 minutes */
export const passwordResetRateLimiter = createRateLimiter(3, 600_000);

/** Message: max 10 messages per 60 seconds per user */
export const messageRateLimiter = createRateLimiter(10, 60_000);
