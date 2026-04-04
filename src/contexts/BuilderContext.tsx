import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'

import { useToast } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { syncBuilderToServer } from '@/features/courses/api/builder/builderSyncService'
import { collaboratorService } from '@/features/courses/api/builder/collaboratorService'
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
import { ConflictResolutionDialog } from '@/features/courses/builder/ConflictResolutionDialog'
import { useBuilderChannel } from '@/features/courses/builder/useBuilderChannel'
import type { ConflictDialogState } from '@/features/courses/builder/useBuilderOffline'
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
  const { tenantId, user, profile } = useAuth()
  const [state, dispatch] = useReducer(builderReducer, initialBuilderState)
  const saveTimerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const savedStatusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Mobile responsive state
  const mobile = useMobileBuilder()

  // Authorized collaborator IDs for server-authoritative channel guard
  const [authorizedUserIds, setAuthorizedUserIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!state.courseId || !tenantId) {
      setAuthorizedUserIds(new Set())
      return
    }

    collaboratorService
      .fetchCollaborators(state.courseId, tenantId)
      .then((collaborators) => {
        const ids = new Set(collaborators.map((c) => c.user_id))
        setAuthorizedUserIds(ids)
      })
      .catch(() => {
        // Non-fatal — fall back to empty set (server RPC check is the primary guard)
        setAuthorizedUserIds(new Set())
      })
  }, [state.courseId, tenantId])

  // Realtime channel for collaborative editing
  const { channelRef, broadcast } = useBuilderChannel(
    state.courseId,
    user?.id ?? null,
    dispatch,
    undefined,
    authorizedUserIds
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
    const result = await syncBuilderToServer(state, tenantId)
    if (result.success) {
      addToast({ type: 'success', message: 'Perubahan berhasil disinkronkan.' })
    } else {
      console.error('[BuilderContext] sync failed:', result.error)
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
