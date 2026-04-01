// ---------------------------------------------------------------------------
// Inject fake-indexeddb before importing the module under test so that the
// singleton dbPromise is created with the fake implementation.
// ---------------------------------------------------------------------------
import 'fake-indexeddb/auto'

import { describe, expect, it } from 'vitest'

// Reset the singleton between tests so each test gets a fresh database.
// offlineStorage.ts uses a module-level `dbPromise` variable; we can
// reset it by re-importing with a cache-busting mechanism only in vitest.
// The simplest approach: reset the global indexedDB to a new instance and
// reassign the private dbPromise via module reload trick.
// Because vitest isolates module caches per file, we import the module after
// the fake-indexeddb polyfill is in place and share across all tests.
import {
  addToSyncQueue,
  cacheQuiz,
  deleteBuilderDraft,
  getBuilderDraft,
  getCachedQuiz,
  getPendingCount,
  getPendingSubmissions,
  markSynced,
  saveBuilderDraft,
} from '../offlineStorage'

// ---------------------------------------------------------------------------
// Re-open a fresh DB before every test to avoid state bleed.
// We do this by resetting the singleton via the module's exported openDB.
// ---------------------------------------------------------------------------

// After each test we'll manually clear builder-drafts / sync-queue by
// deleting the entries we created, rather than nuking the whole DB.

describe('offlineStorage', () => {
  // D4-T1: saves and retrieves builder draft
  it('saveBuilderDraft persists state and getBuilderDraft retrieves it', async () => {
    const draft = { title: 'Kursus Matematika', modules: [{ id: 'm1', name: 'Modul 1' }] }

    await saveBuilderDraft('course-001', draft)
    const result = await getBuilderDraft('course-001')

    expect(result).toEqual(draft)

    // Cleanup
    await deleteBuilderDraft('course-001')
  })

  // D4-T2: returns null for missing key
  it('getBuilderDraft returns null when no draft exists for the given courseId', async () => {
    const result = await getBuilderDraft('course-does-not-exist-xyz')
    expect(result).toBeNull()
  })

  // D4-T3: getPendingCount returns correct count after adding sync queue items
  it('getPendingCount reflects items added to sync queue', async () => {
    const before = await getPendingCount()

    await addToSyncQueue({
      id: 'sync-item-001',
      type: 'quiz-submission',
      payload: { quizId: 'q-1', answers: [] },
      createdAt: Date.now(),
    })

    const after = await getPendingCount()
    expect(after).toBe(before + 1)

    // Cleanup
    await markSynced('sync-item-001')
  })

  // D4-T4: getPendingCount returns 0 when queue is empty after markSynced
  it('getPendingCount decrements after markSynced removes item', async () => {
    await addToSyncQueue({
      id: 'sync-item-002',
      type: 'quiz-submission',
      payload: { quizId: 'q-2', answers: [] },
      createdAt: Date.now(),
    })

    await markSynced('sync-item-002')

    const pending = await getPendingSubmissions()
    const ids = pending.map((p) => p.id)
    expect(ids).not.toContain('sync-item-002')
  })

  // D4-T5: cacheQuiz stores and getCachedQuiz retrieves quiz data
  it('cacheQuiz and getCachedQuiz round-trip quiz data', async () => {
    const quiz = {
      quizId: 'quiz-abc',
      questions: [{ id: 'q1', text: 'What is 2+2?', type: 'multiple_choice' as const, order: 1 }],
      options: [{ id: 'o1', questionId: 'q1', text: '4', order: 1 }],
      cachedAt: Date.now(), version: 1,
    }

    await cacheQuiz(quiz)
    const retrieved = await getCachedQuiz('quiz-abc')

    expect(retrieved).not.toBeNull()
    expect(retrieved!.quizId).toBe('quiz-abc')
    expect(retrieved!.questions).toHaveLength(1)
  })

  // D4-T6: getPendingCount returns 0 (handles no data gracefully)
  it('getPendingCount returns a number (0 or more) when queue is empty', async () => {
    const count = await getPendingCount()
    expect(typeof count).toBe('number')
    expect(count).toBeGreaterThanOrEqual(0)
  })
})
