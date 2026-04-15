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

import { useAuth } from '@/src/contexts/AuthContext'
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
    moveLesson: (
      lessonId: string,
      sourceModuleId: string,
      destinationModuleId: string,
      destinationIndex: number
    ) => Promise<void>
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
  const { channelRef } = useBuilderChannel(state.courseId, user?.id ?? null, dispatch)

  // Presence tracking (who else is editing)
  const presence = useBuilderPresence(
    channelRef,
    user?.id ?? null,
    profile ? `${profile.first_name} ${profile.last_name}`.trim() : 'Anonim',
    profile?.avatar_url ?? null
  )

  // Offline support
  const offline = useBuilderOffline(state.courseId, state)

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
      if (state.savingStatus === 'saving') {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [state.savingStatus])

  // Flush all pending saves on unmount
  useEffect(() => {
    const timers = saveTimerRef.current
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
    }
  }, [])

  // Domain action hooks
  const courseActions = useCourseActions(state, dispatch, tenantId, setSavingStatus)
  const moduleActions = useModuleActions(state, dispatch, tenantId, setSavingStatus)
  const lessonActions = useLessonActions(state, dispatch, tenantId, setSavingStatus)
  const blockActions = useBlockActions(
    state,
    dispatch,
    tenantId,
    setSavingStatus,
    activeLessonIdRef,
    saveTimerRef
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

  // ⚡ Perf: Memoize context value to prevent ALL consumers from re-rendering
  // on every provider render. Without this, every keystroke in a block editor
  // would cascade re-renders to all 10+ BuilderContext consumers.
  const value: BuilderContextValue = useMemo(
    () => ({ state, actions, mobile, presence, offline }),
    [state, actions, mobile, presence, offline]
  )

  return <BuilderContext.Provider value={value}>{children}</BuilderContext.Provider>
}

export function useBuilder() {
  const ctx = useContext(BuilderContext)
  if (!ctx) throw new Error('useBuilder must be used within BuilderProvider')
  return ctx
}
