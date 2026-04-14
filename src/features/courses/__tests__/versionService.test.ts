import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { VersionSnapshotModule } from '../api/versionService'
import { computeVersionDiff } from '../api/versionService'

// ─────────────────────────────────────────────────────────────────────────────
// Mocks for useRestoreVersion
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ tenantId: 'tenant-1' })),
}))

const mockRestoreCourseVersion = vi.fn()

vi.mock('../api/versionService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/versionService')>()
  return {
    ...actual,
    versionService: {
      ...actual.versionService,
      restoreCourseVersion: (...args: unknown[]) => mockRestoreCourseVersion(...args),
    },
  }
})

const mockAddToast = vi.fn()

vi.mock('@/hooks/useToast', () => ({
  useToast: {
    getState: () => ({ addToast: mockAddToast }),
  },
}))

vi.mock('@/utils/sentry', () => ({
  captureError: vi.fn(),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeLesson(id: string, overrides: Partial<{ title: string; is_published: boolean }> = {}) {
  return { id, title: `Lesson ${id}`, is_published: false, ...overrides }
}

function makeModule(
  id: string,
  overrides: Partial<{
    title: string
    order: number
    lessons: VersionSnapshotModule['lessons']
  }> = {}
): VersionSnapshotModule {
  return {
    id,
    title: `Module ${id}`,
    order: 1,
    lessons: [],
    ...overrides,
  }
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  })
}

function createWrapper() {
  const queryClient = createTestQueryClient()
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// computeVersionDiff — pure function
// ─────────────────────────────────────────────────────────────────────────────

describe('computeVersionDiff', () => {
  // ── 1. No changes ─────────────────────────────────────────────────────────

  describe('no changes (identical current and snapshot)', () => {
    it('returns empty arrays and zero counts for identical state', () => {
      const modules: VersionSnapshotModule[] = [
        makeModule('m1', { lessons: [makeLesson('l1'), makeLesson('l2')] }),
        makeModule('m2', { lessons: [makeLesson('l3')] }),
      ]

      const diff = computeVersionDiff(modules, modules)

      expect(diff.restoredModules).toEqual([])
      expect(diff.lostModules).toEqual([])
      expect(diff.modifiedModuleTitles).toEqual([])
      expect(diff.addedLessonCount).toBe(0)
      expect(diff.removedLessonCount).toBe(0)
      expect(diff.impactLevel).toBe('low')
    })

    it('returns impactLevel low for same single module with same title and lessons', () => {
      const mod = makeModule('m1', { title: 'Pengantar', lessons: [makeLesson('l1')] })
      const diff = computeVersionDiff([mod], [mod])

      expect(diff.impactLevel).toBe('low')
    })
  })

  // ── 2. Empty arrays ───────────────────────────────────────────────────────

  describe('empty arrays', () => {
    it('returns all zeros and impactLevel low for both arrays empty', () => {
      const diff = computeVersionDiff([], [])

      expect(diff.restoredModules).toEqual([])
      expect(diff.lostModules).toEqual([])
      expect(diff.modifiedModuleTitles).toEqual([])
      expect(diff.addedLessonCount).toBe(0)
      expect(diff.removedLessonCount).toBe(0)
      expect(diff.impactLevel).toBe('low')
    })

    it('treats non-empty snapshot with empty current as fully restored modules', () => {
      const snapshot = [makeModule('m1'), makeModule('m2')]
      const diff = computeVersionDiff([], snapshot)

      expect(diff.restoredModules).toHaveLength(2)
      expect(diff.lostModules).toHaveLength(0)
    })

    it('treats non-empty current with empty snapshot as fully lost modules', () => {
      const current = [makeModule('m1'), makeModule('m2')]
      const diff = computeVersionDiff(current, [])

      expect(diff.lostModules).toHaveLength(2)
      expect(diff.restoredModules).toHaveLength(0)
    })
  })

  // ── 3. Lost modules ───────────────────────────────────────────────────────

  describe('lost modules (in current but NOT in snapshot)', () => {
    it('identifies 1 lost module with impactLevel medium', () => {
      const current = [makeModule('m1'), makeModule('m2')]
      const snapshot = [makeModule('m1')]

      const diff = computeVersionDiff(current, snapshot)

      expect(diff.lostModules).toHaveLength(1)
      expect(diff.lostModules[0].id).toBe('m2')
      expect(diff.impactLevel).toBe('medium')
    })

    it('identifies 2 lost modules with impactLevel high', () => {
      const current = [makeModule('m1'), makeModule('m2'), makeModule('m3')]
      const snapshot = [makeModule('m1')]

      const diff = computeVersionDiff(current, snapshot)

      expect(diff.lostModules).toHaveLength(2)
      expect(diff.impactLevel).toBe('high')
    })

    it('preserves full module data (title, order, lessons) on lost module', () => {
      const lostMod = makeModule('m99', {
        title: 'Modul Khusus',
        order: 5,
        lessons: [makeLesson('lx', { is_published: true })],
      })
      const diff = computeVersionDiff([lostMod], [])

      expect(diff.lostModules[0]).toEqual(lostMod)
    })
  })

  // ── 4. Restored modules ───────────────────────────────────────────────────

  describe('restored modules (in snapshot but NOT in current)', () => {
    it('identifies modules present in snapshot but absent in current', () => {
      const current = [makeModule('m1')]
      const snapshot = [makeModule('m1'), makeModule('m2'), makeModule('m3')]

      const diff = computeVersionDiff(current, snapshot)

      expect(diff.restoredModules).toHaveLength(2)
      const ids = diff.restoredModules.map((m) => m.id)
      expect(ids).toContain('m2')
      expect(ids).toContain('m3')
    })

    it('restored modules do NOT appear in lostModules', () => {
      const current = [makeModule('m1')]
      const snapshot = [makeModule('m1'), makeModule('m2')]

      const diff = computeVersionDiff(current, snapshot)

      expect(diff.lostModules).toHaveLength(0)
      expect(diff.restoredModules).toHaveLength(1)
    })

    it('restored modules alone (no lost) → impactLevel stays low when removedLessonCount <= 3', () => {
      const current: VersionSnapshotModule[] = []
      const snapshot = [makeModule('m1'), makeModule('m2')]

      const diff = computeVersionDiff(current, snapshot)

      // No lost modules, no removed lessons
      expect(diff.lostModules).toHaveLength(0)
      expect(diff.removedLessonCount).toBe(0)
      expect(diff.impactLevel).toBe('low')
    })

    it('preserves full module data on restored module', () => {
      const snapMod = makeModule('m5', {
        title: 'Materi Lama',
        order: 3,
        lessons: [makeLesson('la'), makeLesson('lb')],
      })
      const diff = computeVersionDiff([], [snapMod])

      expect(diff.restoredModules[0]).toEqual(snapMod)
    })
  })

  // ── 5. Modified module titles ─────────────────────────────────────────────

  describe('modified module titles', () => {
    it('detects renamed module', () => {
      const current = [makeModule('m1', { title: 'Nama Lama' })]
      const snapshot = [makeModule('m1', { title: 'Nama Baru' })]

      const diff = computeVersionDiff(current, snapshot)

      expect(diff.modifiedModuleTitles).toHaveLength(1)
      expect(diff.modifiedModuleTitles[0]).toEqual({
        id: 'm1',
        oldTitle: 'Nama Lama',
        newTitle: 'Nama Baru',
      })
    })

    it('oldTitle is the current title, newTitle is the snapshot title', () => {
      const current = [makeModule('m1', { title: 'Judul Sekarang' })]
      const snapshot = [makeModule('m1', { title: 'Judul Snapshot' })]

      const diff = computeVersionDiff(current, snapshot)

      expect(diff.modifiedModuleTitles[0].oldTitle).toBe('Judul Sekarang')
      expect(diff.modifiedModuleTitles[0].newTitle).toBe('Judul Snapshot')
    })

    it('does NOT report unchanged title as modified', () => {
      const mod = makeModule('m1', { title: 'Sama' })
      const diff = computeVersionDiff([mod], [mod])

      expect(diff.modifiedModuleTitles).toHaveLength(0)
    })

    it('detects multiple renamed modules in one diff', () => {
      const current = [
        makeModule('m1', { title: 'Bab 1 Lama' }),
        makeModule('m2', { title: 'Bab 2 Lama' }),
      ]
      const snapshot = [
        makeModule('m1', { title: 'Bab 1 Baru' }),
        makeModule('m2', { title: 'Bab 2 Baru' }),
      ]

      const diff = computeVersionDiff(current, snapshot)

      expect(diff.modifiedModuleTitles).toHaveLength(2)
    })

    it('does not include a renamed module in restoredModules or lostModules', () => {
      const current = [makeModule('m1', { title: 'Old' })]
      const snapshot = [makeModule('m1', { title: 'New' })]

      const diff = computeVersionDiff(current, snapshot)

      expect(diff.restoredModules).toHaveLength(0)
      expect(diff.lostModules).toHaveLength(0)
    })
  })

  // ── 6. Lesson deltas ──────────────────────────────────────────────────────

  describe('lesson deltas (net counts across all modules)', () => {
    it('computes removedLessonCount when current has more lessons than snapshot', () => {
      const current = [makeModule('m1', { lessons: [makeLesson('l1'), makeLesson('l2')] })]
      const snapshot = [makeModule('m1', { lessons: [] })]

      const diff = computeVersionDiff(current, snapshot)

      expect(diff.removedLessonCount).toBe(2)
      expect(diff.addedLessonCount).toBe(0)
    })

    it('computes addedLessonCount when snapshot has more lessons than current', () => {
      const current = [makeModule('m1', { lessons: [] })]
      const snapshot = [
        makeModule('m1', { lessons: [makeLesson('l1'), makeLesson('l2'), makeLesson('l3')] }),
      ]

      const diff = computeVersionDiff(current, snapshot)

      expect(diff.addedLessonCount).toBe(3)
      expect(diff.removedLessonCount).toBe(0)
    })

    it('both addedLessonCount and removedLessonCount cannot both be positive simultaneously', () => {
      // The implementation uses Math.max(0, delta) so only one side is non-zero
      const current = [makeModule('m1', { lessons: [makeLesson('l1'), makeLesson('l2')] })]
      const snapshot = [makeModule('m1', { lessons: [makeLesson('l3')] })]

      const diff = computeVersionDiff(current, snapshot)

      expect(diff.removedLessonCount).toBe(1)
      expect(diff.addedLessonCount).toBe(0)
    })

    it('sums lessons across all modules (not per-module)', () => {
      // current: 2+1 = 3 lessons; snapshot: 1+0 = 1 lesson → removed = 2
      const current = [
        makeModule('m1', { lessons: [makeLesson('l1'), makeLesson('l2')] }),
        makeModule('m2', { lessons: [makeLesson('l3')] }),
      ]
      const snapshot = [
        makeModule('m1', { lessons: [makeLesson('l1')] }),
        makeModule('m2', { lessons: [] }),
      ]

      const diff = computeVersionDiff(current, snapshot)

      expect(diff.removedLessonCount).toBe(2)
      expect(diff.addedLessonCount).toBe(0)
    })

    it('returns zero for both counts when lesson totals are equal', () => {
      const current = [makeModule('m1', { lessons: [makeLesson('l1'), makeLesson('l2')] })]
      const snapshot = [makeModule('m1', { lessons: [makeLesson('l3'), makeLesson('l4')] })]

      const diff = computeVersionDiff(current, snapshot)

      expect(diff.addedLessonCount).toBe(0)
      expect(diff.removedLessonCount).toBe(0)
    })
  })

  // ── 7. Impact level heuristic ─────────────────────────────────────────────

  describe('impact level heuristic', () => {
    it('returns low when no lost modules and removedLessonCount = 0', () => {
      const diff = computeVersionDiff([], [])
      expect(diff.impactLevel).toBe('low')
    })

    it('returns low when no lost modules and removedLessonCount = 3 (boundary)', () => {
      const current = [
        makeModule('m1', { lessons: [makeLesson('l1'), makeLesson('l2'), makeLesson('l3')] }),
      ]
      const snapshot = [makeModule('m1', { lessons: [] })]

      const diff = computeVersionDiff(current, snapshot)

      expect(diff.removedLessonCount).toBe(3)
      expect(diff.impactLevel).toBe('low')
    })

    it('returns medium when no lost modules and removedLessonCount = 4', () => {
      const lessons = Array.from({ length: 4 }, (_, i) => makeLesson(`l${i}`))
      const current = [makeModule('m1', { lessons })]
      const snapshot = [makeModule('m1', { lessons: [] })]

      const diff = computeVersionDiff(current, snapshot)

      expect(diff.removedLessonCount).toBe(4)
      expect(diff.lostModules).toHaveLength(0)
      expect(diff.impactLevel).toBe('medium')
    })

    it('returns medium when exactly 1 lost module and removedLessonCount = 0', () => {
      const current = [makeModule('m1'), makeModule('m2')]
      const snapshot = [makeModule('m1')]

      const diff = computeVersionDiff(current, snapshot)

      expect(diff.lostModules).toHaveLength(1)
      expect(diff.impactLevel).toBe('medium')
    })

    it('returns medium when 1 lost module and removedLessonCount = 8 (boundary before high)', () => {
      const lessons = Array.from({ length: 8 }, (_, i) => makeLesson(`l${i}`))
      const current = [
        makeModule('m1', { lessons }),
        makeModule('m2'), // lost
      ]
      const snapshot = [makeModule('m1', { lessons: [] })]

      const diff = computeVersionDiff(current, snapshot)

      expect(diff.lostModules).toHaveLength(1)
      expect(diff.removedLessonCount).toBe(8)
      // lostModules.length (1) is NOT > 1 → not high from that; removedLessonCount (8) NOT > 8 → medium
      expect(diff.impactLevel).toBe('medium')
    })

    it('returns high when 2 lost modules', () => {
      const current = [makeModule('m1'), makeModule('m2'), makeModule('m3')]
      const snapshot = [makeModule('m1')]

      const diff = computeVersionDiff(current, snapshot)

      expect(diff.lostModules).toHaveLength(2)
      expect(diff.impactLevel).toBe('high')
    })

    it('returns high when removedLessonCount = 9', () => {
      const lessons = Array.from({ length: 9 }, (_, i) => makeLesson(`l${i}`))
      const current = [makeModule('m1', { lessons })]
      const snapshot = [makeModule('m1', { lessons: [] })]

      const diff = computeVersionDiff(current, snapshot)

      expect(diff.removedLessonCount).toBe(9)
      expect(diff.lostModules).toHaveLength(0)
      expect(diff.impactLevel).toBe('high')
    })

    it('returns high when removedLessonCount > 9', () => {
      const lessons = Array.from({ length: 15 }, (_, i) => makeLesson(`l${i}`))
      const current = [makeModule('m1', { lessons })]
      const snapshot = [makeModule('m1', { lessons: [] })]

      const diff = computeVersionDiff(current, snapshot)

      expect(diff.removedLessonCount).toBe(15)
      expect(diff.impactLevel).toBe('high')
    })

    it('addedLessonCount alone does not raise impact level', () => {
      // 20 lessons being restored (snapshot has more)
      const lessons = Array.from({ length: 20 }, (_, i) => makeLesson(`l${i}`))
      const current = [makeModule('m1', { lessons: [] })]
      const snapshot = [makeModule('m1', { lessons })]

      const diff = computeVersionDiff(current, snapshot)

      expect(diff.addedLessonCount).toBe(20)
      expect(diff.removedLessonCount).toBe(0)
      expect(diff.lostModules).toHaveLength(0)
      expect(diff.impactLevel).toBe('low')
    })
  })

  // ── 8. Combined scenario ──────────────────────────────────────────────────

  describe('combined scenario', () => {
    it('handles mix of lost, restored, modified and lesson delta correctly', () => {
      // current: m1 (title changed), m2 (extra lessons → will be removed), m3 (will be lost)
      // snapshot: m1 (renamed), m2 (fewer lessons), m4 (new — will be restored)
      const current: VersionSnapshotModule[] = [
        makeModule('m1', {
          title: 'Modul Satu Baru',
          lessons: [
            makeLesson('l1'),
            makeLesson('l2'),
            makeLesson('l3'),
            makeLesson('l4'),
            makeLesson('l5'),
          ],
        }),
        makeModule('m2', { title: 'Modul Dua', lessons: [makeLesson('la'), makeLesson('lb')] }),
        makeModule('m3', { title: 'Modul Tiga', lessons: [makeLesson('lx')] }),
      ]
      const snapshot: VersionSnapshotModule[] = [
        makeModule('m1', { title: 'Modul Satu Lama', lessons: [makeLesson('l1')] }),
        makeModule('m2', { title: 'Modul Dua', lessons: [] }),
        makeModule('m4', { title: 'Modul Empat', lessons: [makeLesson('lz')] }),
      ]

      const diff = computeVersionDiff(current, snapshot)

      // m3 in current but not in snapshot → lost
      expect(diff.lostModules).toHaveLength(1)
      expect(diff.lostModules[0].id).toBe('m3')

      // m4 in snapshot but not in current → restored
      expect(diff.restoredModules).toHaveLength(1)
      expect(diff.restoredModules[0].id).toBe('m4')

      // m1 title changed
      expect(diff.modifiedModuleTitles).toHaveLength(1)
      expect(diff.modifiedModuleTitles[0]).toEqual({
        id: 'm1',
        oldTitle: 'Modul Satu Baru',
        newTitle: 'Modul Satu Lama',
      })

      // Lesson counts: current = 5 + 2 + 1 = 8; snapshot = 1 + 0 + 1 = 2 → removed = 6
      expect(diff.removedLessonCount).toBe(6)
      expect(diff.addedLessonCount).toBe(0)

      // 1 lost module → at least medium; removedLessonCount = 6 (≤ 8) → medium, not high
      expect(diff.impactLevel).toBe('medium')
    })

    it('combined high-impact scenario with 2 lost modules and many removed lessons', () => {
      const manyLessons = Array.from({ length: 10 }, (_, i) => makeLesson(`l${i}`))
      const current = [
        makeModule('m1', { lessons: manyLessons }),
        makeModule('m2'),
        makeModule('m3'),
      ]
      const snapshot = [makeModule('m1', { lessons: [] })]

      const diff = computeVersionDiff(current, snapshot)

      expect(diff.lostModules).toHaveLength(2)
      expect(diff.removedLessonCount).toBe(10)
      expect(diff.impactLevel).toBe('high')
    })
  })

  // ── Edge cases ────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('module with empty lessons array contributes 0 to lesson count', () => {
      const current = [makeModule('m1', { lessons: [] })]
      const snapshot = [makeModule('m1', { lessons: [] })]

      const diff = computeVersionDiff(current, snapshot)

      expect(diff.addedLessonCount).toBe(0)
      expect(diff.removedLessonCount).toBe(0)
    })

    it('handles many modules without mutation (pure function, no side effects)', () => {
      const current = Array.from({ length: 10 }, (_, i) => makeModule(`m${i}`))
      const snapshot = Array.from({ length: 10 }, (_, i) => makeModule(`m${i}`))

      const diffA = computeVersionDiff(current, snapshot)
      const diffB = computeVersionDiff(current, snapshot)

      expect(diffA).toEqual(diffB)
    })

    it('does not mutate input arrays', () => {
      const current = [makeModule('m1'), makeModule('m2')]
      const snapshot = [makeModule('m1')]
      const currentCopy = [...current]

      computeVersionDiff(current, snapshot)

      expect(current).toHaveLength(currentCopy.length)
      expect(current[0]).toEqual(currentCopy[0])
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// useRestoreVersion — mutation hook
// ─────────────────────────────────────────────────────────────────────────────

describe('useRestoreVersion', () => {
  // Import is deferred to run after all vi.mock calls are hoisted
  let useRestoreVersion: typeof import('../queries/useCourseVersions').useRestoreVersion
  let courseKeys: typeof import('../queries/courseKeys').courseKeys
  let useAuth: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()
    ;({ useRestoreVersion } = await import('../queries/useCourseVersions'))
    ;({ courseKeys } = await import('../queries/courseKeys'))
    ;({ useAuth } = (await import('@/contexts/AuthContext')) as unknown as {
      useAuth: ReturnType<typeof vi.fn>
    })
  })

  describe('onSuccess cache invalidation', () => {
    it('invalidates builder, detail, and versions keys with correct tenantId and courseId', async () => {
      mockRestoreCourseVersion.mockResolvedValue({ success: true })

      const queryClient = createTestQueryClient()
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children)

      const { result } = renderHook(() => useRestoreVersion(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync({ versionId: 'v-1', courseId: 'course-1' })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: courseKeys.builder('tenant-1', 'course-1'),
      })
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: courseKeys.detail('tenant-1', 'course-1'),
      })
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: courseKeys.versions('tenant-1', 'course-1'),
      })
    })

    it('invalidates exactly 3 query keys on success', async () => {
      mockRestoreCourseVersion.mockResolvedValue({ success: true })

      const queryClient = createTestQueryClient()
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children)

      const { result } = renderHook(() => useRestoreVersion(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync({ versionId: 'v-1', courseId: 'course-abc' })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(invalidateSpy).toHaveBeenCalledTimes(3)
    })

    it('passes correct courseId when invalidating different courses', async () => {
      mockRestoreCourseVersion.mockResolvedValue({ success: true })

      const queryClient = createTestQueryClient()
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children)

      const { result } = renderHook(() => useRestoreVersion(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync({ versionId: 'v-2', courseId: 'course-xyz' })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      const calls = invalidateSpy.mock.calls.map((c) => c[0])
      const keys = calls.map((c) => JSON.stringify((c as { queryKey: unknown }).queryKey))

      expect(keys.every((k) => k.includes('course-xyz'))).toBe(true)
    })
  })

  describe('onSuccess fallback when tenantId is null', () => {
    it('falls back to courseKeys.all with empty string when tenantId is null', async () => {
      // Temporarily override useAuth to return null tenantId
      useAuth.mockReturnValue({ tenantId: null })
      mockRestoreCourseVersion.mockResolvedValue({ success: true })

      const queryClient = createTestQueryClient()
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(QueryClientProvider, { client: queryClient }, children)

      const { result } = renderHook(() => useRestoreVersion(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync({ versionId: 'v-1', courseId: 'course-1' })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // When tenantId is null, it uses a predicate to invalidate all courses-scope queries
      expect(invalidateSpy).toHaveBeenCalledWith({
        predicate: expect.any(Function),
      })
      expect(invalidateSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('onError toast', () => {
    it('calls addToast with Indonesian error message on mutation failure', async () => {
      mockRestoreCourseVersion.mockRejectedValue(new Error('DB error'))

      const { result } = renderHook(() => useRestoreVersion(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.mutate({ versionId: 'v-bad', courseId: 'course-1' })
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(mockAddToast).toHaveBeenCalledTimes(1)
      expect(mockAddToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: 'Gagal memulihkan versi kursus.',
        })
      )
    })

    it('includes description in the error toast', async () => {
      mockRestoreCourseVersion.mockRejectedValue(new Error('DB error'))

      const { result } = renderHook(() => useRestoreVersion(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.mutate({ versionId: 'v-bad', courseId: 'course-1' })
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(mockAddToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Perubahan tidak diterapkan. Coba lagi atau hubungi admin.',
        })
      )
    })

    it('does NOT call addToast on success', async () => {
      mockRestoreCourseVersion.mockResolvedValue({ success: true })

      const { result } = renderHook(() => useRestoreVersion(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.mutateAsync({ versionId: 'v-ok', courseId: 'course-1' })
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockAddToast).not.toHaveBeenCalled()
    })
  })

  describe('mutation function', () => {
    it('calls versionService.restoreCourseVersion with versionId only', async () => {
      mockRestoreCourseVersion.mockResolvedValue({ success: true })

      const { result } = renderHook(() => useRestoreVersion(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.mutateAsync({ versionId: 'v-42', courseId: 'course-1' })
      })

      expect(mockRestoreCourseVersion).toHaveBeenCalledWith('v-42')
    })

    it('courseId is used for invalidation only (not passed to restoreCourseVersion)', async () => {
      mockRestoreCourseVersion.mockResolvedValue({ success: true })

      const { result } = renderHook(() => useRestoreVersion(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.mutateAsync({ versionId: 'v-1', courseId: 'course-999' })
      })

      // Only one arg (versionId) passed to the service
      expect(mockRestoreCourseVersion).toHaveBeenCalledWith('v-1')
      expect(mockRestoreCourseVersion).not.toHaveBeenCalledWith('v-1', 'course-999')
    })
  })
})
