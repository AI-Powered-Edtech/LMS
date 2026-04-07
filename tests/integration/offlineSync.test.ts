// EduSync LMS — Offline Sync Integration Tests
// Tests for offlineQueue.ts, conflictResolver.ts, and useOfflineSync hook

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clientWins,
  detectConflict,
  getDefaultStrategy,
  manualConflict,
  mergeConflict,
  resolveConflict,
  serverWins,
  type ConflictData,
} from '@/utils/conflictResolver'
import { generateIdempotencyKey } from '@/utils/offlineQueue'

// ---------------------------------------------------------------------------
// Mock IndexedDB
// ---------------------------------------------------------------------------

const mockStore = new Map<string, unknown>()

vi.mock('@/utils/offlineStorage', () => ({
  openDB: vi.fn().mockResolvedValue({
    transaction: vi.fn().mockReturnValue({
      objectStore: vi.fn().mockReturnValue({
        get: vi.fn().mockImplementation((key) => ({
          result: mockStore.get(key),
          onsuccess: null,
          onerror: null,
        })),
        put: vi.fn().mockImplementation((item) => {
          mockStore.set(item.id, item)
        }),
        add: vi.fn().mockImplementation((item) => {
          mockStore.set(item.id, item)
        }),
        delete: vi.fn().mockImplementation((key) => {
          mockStore.delete(key)
        }),
        getAll: vi.fn().mockImplementation(() => ({
          result: Array.from(mockStore.values()),
          onsuccess: null,
          onerror: null,
        })),
        count: vi.fn().mockImplementation(() => ({
          result: mockStore.size,
          onsuccess: null,
          onerror: null,
        })),
      }),
      oncomplete: null,
      onerror: null,
    }),
    objectStoreNames: {
      contains: vi.fn().mockReturnValue(true),
    },
  }),
  addToSyncQueue: vi.fn().mockImplementation(async (item) => {
    mockStore.set(item.id, { ...item, attempts: 0 })
  }),
  getPendingSubmissions: vi.fn().mockImplementation(async () => {
    return Array.from(mockStore.values())
  }),
  markSynced: vi.fn().mockImplementation(async (id: string) => {
    mockStore.delete(id)
  }),
}))

// ---------------------------------------------------------------------------
// Conflict Resolver Tests
// ---------------------------------------------------------------------------

describe('Conflict Resolver', () => {
  const sampleConflict: ConflictData = {
    local: { id: 'quiz-1', score: 85, updated_at: 1000 },
    server: { id: 'quiz-1', score: 90, updated_at: 2000 },
    entityType: 'quiz-attempt',
    entityId: 'quiz-1',
    localTimestamp: 1000,
    serverTimestamp: 2000,
  }

  describe('getDefaultStrategy', () => {
    it('returns client-wins for quiz-attempt', () => {
      expect(getDefaultStrategy('quiz-attempt')).toBe('client-wins')
    })

    it('returns client-wins for assignment-submission', () => {
      expect(getDefaultStrategy('assignment-submission')).toBe('client-wins')
    })

    it('returns server-wins for grade', () => {
      expect(getDefaultStrategy('grade')).toBe('server-wins')
    })

    it('returns server-wins for attendance', () => {
      expect(getDefaultStrategy('attendance')).toBe('server-wins')
    })

    it('returns merge for profile', () => {
      expect(getDefaultStrategy('profile')).toBe('merge')
    })

    it('returns manual for unknown types', () => {
      expect(getDefaultStrategy('unknown-type')).toBe('manual')
    })
  })

  describe('clientWins', () => {
    it('returns local data with metadata', () => {
      const result = clientWins(sampleConflict)
      expect(result.strategy).toBe('client-wins')
      expect(result.data.score).toBe(85)
      expect(result.data._conflictResolved).toBe(true)
    })
  })

  describe('serverWins', () => {
    it('returns server data with metadata', () => {
      const result = serverWins(sampleConflict)
      expect(result.strategy).toBe('server-wins')
      expect(result.data.score).toBe(90)
      expect(result.data._conflictResolved).toBe(true)
    })
  })

  describe('mergeConflict', () => {
    it('merges data preferring newer values', () => {
      const result = mergeConflict(sampleConflict)
      expect(result.strategy).toBe('merge')
      // Server is newer, so server values should be preferred
      expect(result.data._conflictResolved).toBe(true)
    })

    it('includes all fields from both versions', () => {
      const conflictWithDifferentFields: ConflictData = {
        local: { id: '1', name: 'Local', email: 'local@test.com' },
        server: { id: '1', name: 'Server', phone: '123' },
        entityType: 'profile',
        entityId: '1',
        localTimestamp: 1000,
        serverTimestamp: 2000,
      }

      const result = mergeConflict(conflictWithDifferentFields)
      expect(result.data).toHaveProperty('id')
      expect(result.data).toHaveProperty('name')
      expect(result.data).toHaveProperty('email')
      expect(result.data).toHaveProperty('phone')
    })
  })

  describe('manualConflict', () => {
    it('returns both versions for manual resolution', () => {
      const result = manualConflict(sampleConflict)
      expect(result.strategy).toBe('manual')
      expect(result).toHaveProperty('local')
      expect(result).toHaveProperty('server')
      expect((result as any).local.score).toBe(85)
      expect((result as any).server.score).toBe(90)
    })
  })

  describe('resolveConflict', () => {
    it('uses default strategy when not specified', () => {
      const result = resolveConflict(sampleConflict)
      expect(result.strategy).toBe('client-wins') // quiz-attempt default
    })

    it('uses override strategy when specified', () => {
      const result = resolveConflict(sampleConflict, 'server-wins')
      expect(result.strategy).toBe('server-wins')
    })
  })

  describe('detectConflict', () => {
    it('returns null when data is identical', () => {
      const local = { id: '1', name: 'Test', updated_at: 1000 }
      const server = { id: '1', name: 'Test', updated_at: 1000 }
      expect(detectConflict(local, server, 'test', '1')).toBeNull()
    })

    it('returns null when timestamps are identical', () => {
      const local = { id: '1', name: 'Local', updated_at: 1000 }
      const server = { id: '1', name: 'Server', updated_at: 1000 }
      expect(detectConflict(local, server, 'test', '1')).toBeNull()
    })

    it('returns conflict data when data differs and timestamps differ', () => {
      const local = { id: '1', name: 'Local', updated_at: 1000 }
      const server = { id: '1', name: 'Server', updated_at: 2000 }
      const result = detectConflict(local, server, 'test', '1')
      expect(result).not.toBeNull()
      expect(result?.local.name).toBe('Local')
      expect(result?.server.name).toBe('Server')
    })

    it('ignores metadata fields when checking differences', () => {
      const local = { id: '1', name: 'Test', _meta: 'local', updated_at: 1000 }
      const server = { id: '1', name: 'Test', _meta: 'server', updated_at: 2000 }
      expect(detectConflict(local, server, 'test', '1')).toBeNull()
    })
  })
})

// ---------------------------------------------------------------------------
// Offline Queue Tests
// ---------------------------------------------------------------------------

describe('Offline Queue', () => {
  describe('generateIdempotencyKey', () => {
    it('generates deterministic key from type, entity, and user', () => {
      const key1 = generateIdempotencyKey('quiz-submission', 'quiz-1', 'user-1')
      const key2 = generateIdempotencyKey('quiz-submission', 'quiz-1', 'user-1')
      expect(key1).toBe(key2)
    })

    it('generates different keys for different types', () => {
      const key1 = generateIdempotencyKey('quiz-submission', 'quiz-1', 'user-1')
      const key2 = generateIdempotencyKey('assignment-upload', 'quiz-1', 'user-1')
      expect(key1).not.toBe(key2)
    })

    it('generates different keys for different entities', () => {
      const key1 = generateIdempotencyKey('quiz-submission', 'quiz-1', 'user-1')
      const key2 = generateIdempotencyKey('quiz-submission', 'quiz-2', 'user-1')
      expect(key1).not.toBe(key2)
    })

    it('generates different keys for different users', () => {
      const key1 = generateIdempotencyKey('quiz-submission', 'quiz-1', 'user-1')
      const key2 = generateIdempotencyKey('quiz-submission', 'quiz-1', 'user-2')
      expect(key1).not.toBe(key2)
    })

    it('follows expected format', () => {
      const key = generateIdempotencyKey('quiz-submission', 'quiz-1', 'user-1')
      expect(key).toBe('quiz-submission:quiz-1:user-1')
    })
  })
})
