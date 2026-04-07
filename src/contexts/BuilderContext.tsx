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
import {
  builderReducer,
  type BuilderState,
  initialBuilderState,
  useBlockActions,
  useCourseActions,
  useLessonActions,
  useModuleActions,
} from '@/features/course-builder'
import { syncBuilderToServer } from '@/features/course-builder/api/builderSyncService'
import { ConflictResolutionDialog } from '@/features/course-builder/ConflictResolutionDialog'
import type { ConflictDialogState } from '@/features/course-builder/useBuilderOffline'
import { useBuilderOffline } from '@/features/course-builder/useBuilderOffline'
import { useMobileBuilder } from '@/features/course-builder/useMobileBuilder'
import type { DomainBlock } from '@/shared/types/blockTypes'
import type { DomainLesson } from '@/shared/types/lessonTypes'
import { logDevError } from '@/utils/logDevError'

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
  offline: {
    isOnline: boolean
    isDirty: boolean
    lastSavedAt: Date | null
    hasPendingDraft: boolean
    saveNow: () => Promise<void>
    syncToServer: () => Promise<void>
    conflictDialog: ConflictDialogState | null
    handleConflictUseLocal: () => Promise<void>
    handleConflictUseServer: () => void
    dismissConflictDialog: () => void
  }
}

const BuilderContext = createContext<BuilderContextValue | null>(null)

// ============================================================
// Provider
// ============================================================

export function BuilderProvider({ children }: { children: ReactNode }) {
  const { tenantId } = useAuth()
  const [state, dispatch] = useReducer(builderReducer, initialBuilderState)
  const saveTimerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const savedStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Mobile responsive state
  const mobile = useMobileBuilder()

  // Offline support
  const addToast = useToast((s) => s.addToast)

  // Stable sync callback — wrapped in useCallback to prevent useBuilderOffline
  // from re-subscribing on every render when state or tenantId change.
  const handleSync = useCallback(async () => {
    if (!state.courseId || !tenantId) return
    const result = await syncBuilderToServer(state, tenantId)
    if (result.success) {
      addToast({ type: 'success', message: 'Perubahan berhasil disinkronkan.' })
    } else {
      logDevError('BuilderContext', 'Sync failed:', result.error)
      addToast({ type: 'error', message: 'Gagal menyinkronkan ke server. Coba lagi.' })
    }
  }, [state, tenantId, addToast])

  const offline = useBuilderOffline(state.courseId, state, handleSync)

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
      if (state.savingStatus === 'saving' || offline.isDirty) {
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
  // NOTE: ...lessonActions already includes updateLesson — no duplicate spread needed.
  const actions = useMemo(
    () => ({
      ...courseActions,
      ...moduleActions,
      ...lessonActions,
      ...blockActions,
    }),
    [courseActions, moduleActions, lessonActions, blockActions]
  )

  // ⚡ Perf: Split memoization so stable parts (actions, mobile, offline)
  // don't get a new reference every time volatile `state` changes (e.g. on every
  // keystroke). The stableValue memo only recreates when those rarely-changing
  // values actually change; the outer value memo still updates whenever state
  // changes (expected), but preserves the stable inner references.
  const stableValue = useMemo(() => ({ actions, mobile, offline }), [actions, mobile, offline])

  const value: BuilderContextValue = useMemo(
    () => ({ ...stableValue, state }),
    [stableValue, state]
  )

  return (
    <BuilderContext.Provider value={value}>
      {children}
      {offline.conflictDialog && (
        <ConflictResolutionDialog
          isOpen={offline.conflictDialog.isOpen}
          localUpdatedAt={offline.conflictDialog.localUpdatedAt}
          serverUpdatedAt={offline.conflictDialog.serverUpdatedAt}
          onUseLocal={offline.handleConflictUseLocal}
          onUseServer={offline.handleConflictUseServer}
          onClose={offline.dismissConflictDialog}
        />
      )}
    </BuilderContext.Provider>
  )
}

export function useBuilder() {
  const ctx = useContext(BuilderContext)
  if (!ctx) throw new Error('useBuilder must be used within BuilderProvider')
  return ctx
}
