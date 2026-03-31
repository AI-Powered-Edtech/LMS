import { useCallback, useEffect, useRef, useState } from 'react'

import { useNetworkStatus } from '@/src/hooks/useNetworkStatus'
import { deleteBuilderDraft, saveBuilderDraft } from '@/src/utils/offlineStorage'

import type { BuilderState } from './builderReducer'

interface OfflineState {
  isOnline: boolean
  isDirty: boolean
  lastSavedAt: Date | null
  hasPendingDraft: boolean
  saveNow: () => Promise<void>
  syncToServer: () => Promise<void>
}

export function useBuilderOffline(
  courseId: string | null,
  state: BuilderState,
  syncFn?: () => Promise<void>
): OfflineState {
  const { isOnline, wasOffline, resetWasOffline } = useNetworkStatus()
  const [isDirty, setIsDirty] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [hasPendingDraft, setHasPendingDraft] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Lightweight change-detection refs — avoids expensive JSON.stringify on large state trees
  const stateVersionRef = useRef(0)
  const prevTitleRef = useRef('')
  const prevDescriptionRef = useRef('')
  const prevModulesLengthRef = useRef(0)
  const prevActiveBlocksRef = useRef(0)
  // Track the last state version that was scheduled for save so we can detect new changes
  const lastSavedVersionRef = useRef(-1)

  // Auto-save to IndexedDB every 5 seconds if state changed
  useEffect(() => {
    if (!courseId) return

    // Detect meaningful changes without serialising the full state tree
    const hasChanged =
      state.courseTitle !== prevTitleRef.current ||
      state.courseDescription !== prevDescriptionRef.current ||
      state.modules.length !== prevModulesLengthRef.current ||
      (state.activeLesson?.blocks.length ?? 0) !== prevActiveBlocksRef.current

    if (!hasChanged) return

    // Bump version counter and update tracking refs
    stateVersionRef.current += 1
    prevTitleRef.current = state.courseTitle
    prevDescriptionRef.current = state.courseDescription ?? ''
    prevModulesLengthRef.current = state.modules.length
    prevActiveBlocksRef.current = state.activeLesson?.blocks.length ?? 0

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)

    const capturedVersion = stateVersionRef.current
    saveTimerRef.current = setTimeout(async () => {
      // Skip if a newer change has already superseded this scheduled save
      if (capturedVersion <= lastSavedVersionRef.current) return
      try {
        await saveBuilderDraft(courseId, state)
        lastSavedVersionRef.current = capturedVersion
        setLastSavedAt(new Date())
        setIsDirty(!isOnline)
        setHasPendingDraft(!isOnline)
      } catch {
        // IndexedDB save failed — non-critical
      }
    }, 5000)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [courseId, state, isOnline])

  // Sync when coming back online
  useEffect(() => {
    if (wasOffline && isOnline && hasPendingDraft && courseId) {
      const doSync = async () => {
        try {
          if (syncFn) {
            await syncFn()
          }
          await deleteBuilderDraft(courseId)
          setHasPendingDraft(false)
          setIsDirty(false)
          resetWasOffline()
        } catch (e) {
          console.error('Builder offline sync failed:', e)
        }
      }
      doSync()
    }
  }, [wasOffline, isOnline, hasPendingDraft, courseId, resetWasOffline, syncFn])

  const saveNow = useCallback(async () => {
    if (!courseId) return
    await saveBuilderDraft(courseId, state)
    setLastSavedAt(new Date())
  }, [courseId, state])

  const syncToServer = useCallback(async () => {
    if (!courseId) return
    if (syncFn) {
      await syncFn()
    }
    await deleteBuilderDraft(courseId)
    setHasPendingDraft(false)
    setIsDirty(false)
  }, [courseId, syncFn])

  return { isOnline, isDirty, lastSavedAt, hasPendingDraft, saveNow, syncToServer }
}
