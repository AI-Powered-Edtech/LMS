import { logger } from '@/utils/logger'
// Client-side cache layer using localStorage with TTL
// Reduces backend round-trips by caching query results

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttlMinutes: number
}

const CACHE_PREFIX = 'edusync_cache_'

export function getCached<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(CACHE_PREFIX + key)
    if (!item) return null
    const entry: CacheEntry<T> = JSON.parse(item)
    const ageMs = Date.now() - entry.timestamp
    const ttlMs = entry.ttlMinutes * 60 * 1000
    if (ageMs > ttlMs) {
      localStorage.removeItem(CACHE_PREFIX + key)
      return null
    }
    return entry.data
  } catch {
    return null
  }
}

export function setCache<T>(key: string, data: T, ttlMinutes: number): void {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttlMinutes }
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry))
  } catch {
    // localStorage full — clear old entries and retry
    clearCache()
    try {
      const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttlMinutes }
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry))
    } catch {
      // Silently fail — app works without cache
      if (import.meta.env.DEV)
        logger.warn('[cache] localStorage quota exceeded, clearing and retrying:', key)
    }
  }
}

export function clearCache(prefix?: string): void {
  const target = CACHE_PREFIX + (prefix || '')
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(target)) keysToRemove.push(key)
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k))
}

// Wrapper: returns cached data if fresh, otherwise calls queryFn and caches result
export async function cachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  ttlMinutes: number = 15
): Promise<T> {
  const cached = getCached<T>(key)
  if (cached !== null) return cached
  try {
    const data = await queryFn()
    setCache(key, data, ttlMinutes)
    return data
  } catch (error) {
    // Remove any corrupted/partial cache entry, then re-throw
    // so React Query receives the error and enters isError state
    try {
      localStorage.removeItem('edusync_cache_' + key)
    } catch {
      if (import.meta.env.DEV)
        logger.warn('[cache] Failed to remove corrupted cache entry for key:', key)
    }
    throw error
  }
}

// Cache key helpers for consistency
export const CacheKeys = {
  xpProfile: (userId: string) => `xp_${userId}`,
  badges: (userId: string) => `badges_${userId}`,
  leaderboard: (courseId: string, period: string) => `lb_${courseId}_${period}`,
  teacherAnalytics: (courseId: string) => `analytics_${courseId}`,
  courseCatalog: (tenantId: string) => `catalog_${tenantId}`,
  classOverview: (classId: string) => `class_${classId}`,
  progress: (userId: string, courseId: string) => `progress_${userId}_${courseId}`,
} as const

// Invalidation helpers — call after mutations
export function invalidateUserCache(userId: string): void {
  clearCache(`xp_${userId}`)
  clearCache(`badges_${userId}`)
  clearCache(`progress_${userId}`)
}

export function invalidateCourseCache(courseId: string): void {
  clearCache(`analytics_${courseId}`)
  clearCache(`lb_${courseId}`)
  clearCache(`class_${courseId}`)
}
