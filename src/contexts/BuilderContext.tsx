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

import { useToast } from '@/src/components/ui'
import { useAuth } from '@/src/contexts/AuthContext'
import { builderBlockService } from '@/src/features/courses/api/builder/blockService'
import { builderLessonService } from '@/src/features/courses/api/builder/lessonService'
import { builderModuleService } from '@/src/features/courses/api/builder/moduleService'
import { courseService } from '@/src/features/courses/api/courseService'
import {
  builderReducer,
  type BuilderState,
  initialBuilderState,
  useBlockActions,
  useBuilderPresence,
  useCourseActions,
  useLessonActions,
  useModuleActions,
} from '@/src/features/courses/builder'
import { useBuilderChannel } from '@/src/features/courses/builder/useBuilderChannel'
import { useBuilderOffline } from '@/src/features/courses/builder/useBuilderOffline'
import type { PresenceData } from '@/src/features/courses/builder/useBuilderPresence'
import { useMobileBuilder } from '@/src/features/courses/builder/useMobileBuilder'
import { DomainBlock } from '@/src/shared/types/blockTypes'
import { DomainLesson } from '@/src/shared/types/lessonTypes'

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

  // Realtime channel for collaborative editing
  const { channelRef, broadcast } = useBuilderChannel(state.courseId, user?.id ?? null, dispatch)

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
      if (state.savingStatus === 'saving' || offline.isDirty || hasPendingTimers) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [state.savingStatus, offline.isDirty])

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

  // Domain action hooks
  const userName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : 'Anonim'

  const courseActions = useCourseActions(state, dispatch, tenantId, setSavingStatus)
  const moduleActions = useModuleActions(
    state,
    dispatch,
    tenantId,
    setSavingStatus,
    broadcast,
    userName
  )
  const lessonActions = useLessonActions(
    state,
    dispatch,
    tenantId,
    setSavingStatus,
    broadcast,
    userName
  )
  const blockActions = useBlockActions(
    state,
    dispatch,
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
      updateLesson: lessonActions.updateLesson,
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
