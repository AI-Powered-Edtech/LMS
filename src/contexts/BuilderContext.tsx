import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react'

import { useToast } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { builderBlockService } from '@/features/courses/api/builder/blockService'
import { builderLessonService } from '@/features/courses/api/builder/lessonService'
import { builderModuleService } from '@/features/courses/api/builder/moduleService'
import { courseService } from '@/features/courses/api/courseService'
import {
  builderReducer,
  type BuilderState,
  initialBuilderState,
  useBlockActions,
  useBuilderPresence,
  useCourseActions,
  useLessonActions,
  useModuleActions,
} from '@/features/courses/builder'
import { useBuilderChannel } from '@/features/courses/builder/useBuilderChannel'
import { useBuilderOffline } from '@/features/courses/builder/useBuilderOffline'
import type { PresenceData } from '@/features/courses/builder/useBuilderPresence'
import { useMobileBuilder } from '@/features/courses/builder/useMobileBuilder'
import { DomainBlock } from '@/shared/types/blockTypes'
import { DomainLesson } from '@/shared/types/lessonTypes'

// ============================================================
// Context Interface
// ============================================================

interface BuilderContextValue {
  state: BuilderState
  actions: {
    loadCourse: (courseId: string) => Promise<void>
    publishCourse: () => Promise<void>
    draftCourse: () => Promise<void>
    submitForReview: () => Promise<void>
    approveCourse: () => Promise<void>
    addModule: (title: string) => Promise<void>
    updateModule: (
      moduleId: string,
      data: { title?: string; description?: string }
    ) => Promise<void>
    deleteModule: (moduleId: string) => Promise<void>
    reorderModules: (moduleIds: string[]) => Promise<void>
    addLesson: (moduleId: string, type: string, title: string) => Promise<void>
    updateLesson: (lessonId: string, data: Partial<DomainLesson>) => Promise<void>
    deleteLesson: (lessonId: string) => Promise<void>
    reorderLessons: (lessonIds: string[]) => Promise<void>
    selectLesson: (lessonId: string) => Promise<void>
    closeLesson: () => void
    addBlock: (type: string) => Promise<void>
    updateBlock: (blockId: string, data: Partial<DomainBlock>) => void
    deleteBlock: (blockId: string) => Promise<void>
    reorderBlocks: (blockIds: string[]) => Promise<void>
    selectBlock: (blockId: string | null) => void
    saveBlock: (blockId: string) => Promise<void>
  }
  mobile: {
    isMobile: boolean
    isTablet: boolean
    isDesktop: boolean
    sidebarOpen: boolean
    orientation: 'portrait' | 'landscape'
    toggleSidebar: () => void
    closeSidebar: () => void
    openSidebar: () => void
  }
  presence: {
    others: Map<string, PresenceData>
    updateActiveBlock: (blockId: string | null) => void
    getBlockLocker: (blockId: string) => PresenceData | null
    othersArray: PresenceData[]
  }
  offline: {
    isOnline: boolean
    isDirty: boolean
    lastSavedAt: Date | null
    hasPendingDraft: boolean
    saveNow: () => Promise<void>
    syncToServer: () => Promise<void>
  }
}

const BuilderContext = createContext<BuilderContextValue | null>(null)

// ============================================================
// Provider
// ============================================================

export function BuilderProvider({ children }: { children: ReactNode }) {
  const { tenantId, user, profile } = useAuth()
  const [state, dispatch] = useReducer(builderReducer, initialBuilderState)
  const saveTimerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const savedStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Mobile responsive state
  const mobile = useMobileBuilder()

  // FIX 2: Custom dispatch that cancels all pending block save timers before
  // applying UNDO/REDO. Without this, a debounced updateBlock timer that fires
  // after an undo would overwrite the rolled-back state with stale data.
  const safeDispatch = useCallback(
    (action: Parameters<typeof dispatch>[0]) => {
      if (action.type === 'UNDO' || action.type === 'REDO') {
        // Cancel all pending block save timers to prevent stale writes after undo/redo
        saveTimerRef.current.forEach((timer) => clearTimeout(timer))
        saveTimerRef.current.clear()
      }
      dispatch(action)
    },
    [dispatch]
  )

  // Realtime channel for collaborative editing — use safeDispatch so that
  // remote UNDO/REDO broadcasts also flush local pending timers.
  const { channelRef, broadcast } = useBuilderChannel(
    state.courseId,
    user?.id ?? null,
    safeDispatch
  )

  // Presence tracking (who else is editing)
  const presence = useBuilderPresence(
    channelRef,
    user?.id ?? null,
    profile ? `${profile.first_name} ${profile.last_name}`.trim() : 'Anonim',
    profile?.avatar_url ?? null
  )

  // Offline support
  const addToast = useToast((s) => s.addToast)
  const offline = useBuilderOffline(state.courseId, state, async () => {
    if (!state.courseId || !tenantId) return
    try {
      // 1. Sync course metadata
      await courseService.updateCourse(
        state.courseId,
        { title: state.courseTitle, description: state.courseDescription },
        tenantId
      )

      // 2. Sync module titles (for existing modules that were edited offline)
      await Promise.allSettled(
        state.modules.map((mod) =>
          builderModuleService.updateModule(mod.id, tenantId, { title: mod.title })
        )
      )

      // 3. Sync lesson data (for existing lessons that were edited offline)
      await Promise.allSettled(
        state.modules.flatMap((mod) =>
          mod.lessons.map((lesson) =>
            builderLessonService.updateLesson(lesson.id, tenantId, {
              title: lesson.title,
              isPublished: lesson.isPublished,
              durationMinutes: lesson.durationMinutes,
            })
          )
        )
      )

      // 4. Sync block data for active lesson (if any)
      if (state.activeLesson) {
        await Promise.allSettled(
          state.activeLesson.blocks.map((block) =>
            builderBlockService.updateBlock(block.id, tenantId, {
              title: block.title,
              content: block.content,
              url: block.url,
              metadata: block.metadata,
            })
          )
        )
      }

      addToast({ type: 'success', message: 'Perubahan berhasil disinkronkan.' })
    } catch (e) {
      console.error(e)
      addToast({ type: 'error', message: 'Gagal menyinkronkan ke server. Coba lagi.' })
    }
  })

  // Ref to track activeLesson.id without causing callback re-creation
  const activeLessonIdRef = useRef<string | null>(null)
  activeLessonIdRef.current = state.activeLesson?.id ?? null

  // Helper: set saving status with auto-clear for 'saved' after 3 seconds
  const setSavingStatus = useCallback((status: BuilderState['savingStatus']) => {
    if (savedStatusTimerRef.current) {
      clearTimeout(savedStatusTimerRef.current)
      savedStatusTimerRef.current = null
    }
    dispatch({ type: 'SET_SAVING', status })
    if (status === 'saved') {
      savedStatusTimerRef.current = setTimeout(() => {
        dispatch({ type: 'SET_SAVING', status: 'idle' })
        savedStatusTimerRef.current = null
      }, 3000)
    }
  }, [])

  // beforeunload protection
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      // FIX: Previously only guarded during active save ('saving').
      // If a user made changes that hadn't triggered an auto-save yet
      // (e.g., fast typist or block just added), navigating away silently
      // discarded those changes. Now we also check offline.isDirty which
      // tracks any pending unsaved mutations via the BUILDER_DRAFTS IndexedDB store.
      // M19: Also check for pending debounced block save timers that haven't fired yet.
      // saveTimerRef is a stable ref, so reading .current inside the handler is always fresh.
      const hasPendingTimers = saveTimerRef.current.size > 0

      // FIX 1: Catch lesson title changes that were dispatched (UPDATE_LESSON is an
      // undoable action so it grows _history) but whose debounce timer in
      // LessonBlockEditor hasn't fired yet, meaning the server hasn't been updated.
      // If there's any undo history that hasn't been persisted to the server we
      // treat the session as dirty and warn the user before they close the tab.
      const hasUnsavedHistory = (state._history?.length ?? 0) > 0 && state.savingStatus !== 'saved'

      if (
        state.savingStatus === 'saving' ||
        offline.isDirty ||
        hasPendingTimers ||
        hasUnsavedHistory
      ) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [state.savingStatus, offline.isDirty, state._history?.length])

  // Flush all pending saves on unmount
  useEffect(() => {
    const timers = saveTimerRef.current
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
    }
  }, [])

  // M18: Clear pending block save timers when active lesson changes to prevent stale writes
  useEffect(() => {
    return () => {
      saveTimerRef.current.forEach((timer) => clearTimeout(timer))
      saveTimerRef.current.clear()
    }
  }, [state.activeLesson?.id])

  // Domain action hooks — all wired to safeDispatch so UNDO/REDO (FIX 2)
  // correctly flushes pending debounce timers before rolling back state.
  const userName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : 'Anonim'

  const courseActions = useCourseActions(state, safeDispatch, tenantId, setSavingStatus)
  const moduleActions = useModuleActions(
    state,
    safeDispatch,
    tenantId,
    setSavingStatus,
    broadcast,
    userName
  )
  const lessonActions = useLessonActions(
    state,
    safeDispatch,
    tenantId,
    setSavingStatus,
    broadcast,
    userName
  )
  const blockActions = useBlockActions(
    state,
    safeDispatch,
    tenantId,
    setSavingStatus,
    activeLessonIdRef,
    saveTimerRef,
    broadcast,
    userName,
    presence.getBlockLocker
  )

  // ⚡ Perf: Memoize actions object — the action hooks return stable useCallback refs,
  // so this only recreates when the hook instances change (effectively never).
  const actions = useMemo(
    () => ({
      ...courseActions,
      ...moduleActions,
      ...lessonActions,
      ...blockActions,
    }),
    [courseActions, moduleActions, lessonActions, blockActions]
  )

  // ⚡ Perf: Split memoization so stable parts (actions, mobile, presence, offline)
  // don't get a new reference every time volatile `state` changes (e.g. on every
  // keystroke). The stableValue memo only recreates when those rarely-changing
  // values actually change; the outer value memo still updates whenever state
  // changes (expected), but preserves the stable inner references.
  const stableValue = useMemo(
    () => ({ actions, mobile, presence, offline }),
    [actions, mobile, presence, offline]
  )

  const value: BuilderContextValue = useMemo(
    () => ({ ...stableValue, state }),
    [stableValue, state]
  )

  return <BuilderContext.Provider value={value}>{children}</BuilderContext.Provider>
}

export function useBuilder() {
  const ctx = useContext(BuilderContext)
  if (!ctx) throw new Error('useBuilder must be used within BuilderProvider')
  return ctx
}
