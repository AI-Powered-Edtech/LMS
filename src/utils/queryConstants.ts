/**
 * Stale-time tiers for React Query.
 *
 * STATIC   — data that rarely changes (tenant config, onboarding steps, roles)
 * MODERATE — data that changes a few times per day (courses, scores, leaderboard)
 * DYNAMIC  — data that changes within minutes (calendar, active assignments, quiz attempts)
 * REALTIME — data controlled by WebSocket (notifications) — staleTime=0 so cache is always stale
 */
export const STALE = {
  STATIC: 30 * 60 * 1000, // 30 minutes
  MODERATE: 5 * 60 * 1000, // 5 minutes (global default)
  DYNAMIC: 30 * 1000, // 30 seconds
  REALTIME: 0, // 0 — always stale, updated via subscription
} as const;

/**
 * gcTime tiers — how long data stays in cache after it's no longer used.
 * Should be longer than staleTime so navigating back still shows cached data.
 */
export const GC = {
  SHORT: 5 * 60 * 1000, // 5 minutes
  NORMAL: 10 * 60 * 1000, // 10 minutes (React Query default)
  LONG: 30 * 60 * 1000, // 30 minutes — for static data
} as const;
