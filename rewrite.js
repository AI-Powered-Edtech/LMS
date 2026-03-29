const fs = require('fs');

const content = `import { useCallback, useEffect, useRef, useState } from 'react'

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
  const prevStateRef = useRef<string>('')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-save to IndexedDB every 5 seconds if state changed
  useEffect(() => {
    if (!courseId) return

    const stateHash = JSON.stringify({
      modules: state.modules,
      activeLesson: state.activeLesson,
      courseTitle: state.courseTitle,
      courseDescription: state.courseDescription,
    })

    if (stateHash === prevStateRef.current) return
    prevStateRef.current = stateHash

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)

    saveTimerRef.current = setTimeout(async () => {
      try {
        await saveBuilderDraft(courseId, state)
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
`

fs.writeFileSync('src/features/courses/builder/useBuilderOffline.ts', content)
