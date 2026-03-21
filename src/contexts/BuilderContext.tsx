import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'
import { useAuth } from '@/src/contexts/AuthContext'
import { useToast } from '@/src/contexts/ToastContext'

import { DomainCourse } from '@/src/domain/course/types'
import { DomainModule } from '@/src/domain/module/types'
import { DomainLesson } from '@/src/domain/lesson/types'
import { DomainBlock } from '@/src/domain/block/types'

import { builderCourseService } from '@/src/features/courses/api/builder/courseService'
import { builderModuleService } from '@/src/features/courses/api/builder/moduleService'
import { builderLessonService } from '@/src/features/courses/api/builder/lessonService'
import { builderBlockService } from '@/src/features/courses/api/builder/blockService'

// ============================================================
// State
// ============================================================

export interface BuilderState {
  courseId: string | null
  courseTitle: string
  courseDescription: string | null
  courseStatus: 'draft' | 'published' | 'archived'
  modules: DomainModule[]
  activeLesson: {
    id: string
    blocks: DomainBlock[]
  } | null
  activeBlockId: string | null
  savingStatus: 'idle' | 'saving' | 'saved' | 'error'
  loadingCourse: boolean
  loadingBlocks: boolean
  error: string | null
}

const initialState: BuilderState = {
  courseId: null,
  courseTitle: '',
  courseDescription: null,
  courseStatus: 'draft',
  modules: [],
  activeLesson: null,
  activeBlockId: null,
  savingStatus: 'idle',
  loadingCourse: false,
  loadingBlocks: false,
  error: null,
}

// ============================================================
// Actions
// ============================================================

type BuilderAction =
  | { type: 'LOAD_COURSE_START' }
  | { type: 'LOAD_COURSE_SUCCESS'; course: DomainCourse; modules: DomainModule[] }
  | { type: 'LOAD_COURSE_ERROR'; error: string }
  | { type: 'SET_COURSE_STATUS'; status: 'draft' | 'published' | 'archived' }
  | { type: 'SET_MODULES'; modules: DomainModule[] }
  | { type: 'ADD_MODULE'; module: DomainModule }
  | { type: 'UPDATE_MODULE'; moduleId: string; data: Partial<DomainModule> }
  | { type: 'DELETE_MODULE'; moduleId: string }
  | { type: 'ADD_LESSON'; moduleId: string; lesson: DomainLesson }
  | { type: 'UPDATE_LESSON'; lessonId: string; data: Partial<DomainLesson> }
  | { type: 'DELETE_LESSON'; lessonId: string }
  | { type: 'LOAD_BLOCKS_START' }
  | { type: 'LOAD_BLOCKS_SUCCESS'; lessonId: string; blocks: DomainBlock[] }
  | { type: 'SET_ACTIVE_BLOCK'; blockId: string | null }
  | { type: 'ADD_BLOCK'; block: DomainBlock }
  | { type: 'UPDATE_BLOCK'; blockId: string; data: Partial<DomainBlock> }
  | { type: 'DELETE_BLOCK'; blockId: string }
  | { type: 'SET_BLOCKS'; blocks: DomainBlock[] }
  | { type: 'SET_SAVING'; status: BuilderState['savingStatus'] }
  | { type: 'CLOSE_LESSON' }

function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'LOAD_COURSE_START':
      return { ...state, loadingCourse: true, error: null }
    case 'LOAD_COURSE_SUCCESS':
      return {
        ...state,
        loadingCourse: false,
        courseId: action.course.id,
        courseTitle: action.course.title,
        courseDescription: action.course.description,
        courseStatus: action.course.status,
        modules: action.modules,
      }
    case 'LOAD_COURSE_ERROR':
      return { ...state, loadingCourse: false, error: action.error }
    case 'SET_COURSE_STATUS':
      return { ...state, courseStatus: action.status }
    case 'SET_MODULES':
      return { ...state, modules: action.modules }
    case 'ADD_MODULE':
      return { ...state, modules: [...state.modules, action.module] }
    case 'UPDATE_MODULE':
      return {
        ...state,
        modules: state.modules.map((m) =>
          m.id === action.moduleId ? { ...m, ...action.data } : m
        ),
      }
    case 'DELETE_MODULE':
      return {
        ...state,
        modules: state.modules.filter((m) => m.id !== action.moduleId),
        activeLesson:
          state.activeLesson &&
          state.modules
            .find((m) => m.id === action.moduleId)
            ?.lessons.some((l) => l.id === state.activeLesson?.id)
            ? null
            : state.activeLesson,
      }
    case 'ADD_LESSON':
      return {
        ...state,
        modules: state.modules.map((m) =>
          m.id === action.moduleId ? { ...m, lessons: [...m.lessons, action.lesson] } : m
        ),
      }
    case 'UPDATE_LESSON':
      return {
        ...state,
        modules: state.modules.map((m) => ({
          ...m,
          lessons: m.lessons.map((l) => (l.id === action.lessonId ? { ...l, ...action.data } : l)),
        })),
      }
    case 'DELETE_LESSON':
      return {
        ...state,
        modules: state.modules.map((m) => ({
          ...m,
          lessons: m.lessons.filter((l) => l.id !== action.lessonId),
        })),
        activeLesson: state.activeLesson?.id === action.lessonId ? null : state.activeLesson,
      }
    case 'LOAD_BLOCKS_START':
      return { ...state, loadingBlocks: true }
    case 'LOAD_BLOCKS_SUCCESS':
      return {
        ...state,
        loadingBlocks: false,
        activeLesson: { id: action.lessonId, blocks: action.blocks },
        activeBlockId: null,
      }
    case 'CLOSE_LESSON':
      return { ...state, activeLesson: null, activeBlockId: null }
    case 'SET_ACTIVE_BLOCK':
      return { ...state, activeBlockId: action.blockId }
    case 'ADD_BLOCK':
      if (!state.activeLesson) return state
      return {
        ...state,
        activeLesson: {
          ...state.activeLesson,
          blocks: [...state.activeLesson.blocks, action.block],
        },
      }
    case 'UPDATE_BLOCK':
      if (!state.activeLesson) return state
      return {
        ...state,
        activeLesson: {
          ...state.activeLesson,
          blocks: state.activeLesson.blocks.map((b) =>
            b.id === action.blockId ? { ...b, ...action.data } : b
          ),
        },
      }
    case 'DELETE_BLOCK':
      if (!state.activeLesson) return state
      return {
        ...state,
        activeLesson: {
          ...state.activeLesson,
          blocks: state.activeLesson.blocks.filter((b) => b.id !== action.blockId),
        },
        activeBlockId: state.activeBlockId === action.blockId ? null : state.activeBlockId,
      }
    case 'SET_BLOCKS':
      if (!state.activeLesson) return state
      return {
        ...state,
        activeLesson: { ...state.activeLesson, blocks: action.blocks },
      }
    case 'SET_SAVING':
      return { ...state, savingStatus: action.status }
    default:
      return state
  }
}

// ============================================================
// Context
// ============================================================

interface BuilderContextValue {
  state: BuilderState
  actions: {
    loadCourse: (courseId: string) => Promise<void>
    publishCourse: () => Promise<void>
    draftCourse: () => Promise<void>
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
}

const BuilderContext = createContext<BuilderContextValue | null>(null)

// ============================================================
// Provider
// ============================================================

export function BuilderProvider({ children }: { children: ReactNode }) {
  const { tenantId } = useAuth()
  const { toast } = useToast()
  const [state, dispatch] = useReducer(builderReducer, initialState)
  const saveTimerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // ─── beforeunload protection ──────────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (state.savingStatus === 'saving') {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [state.savingStatus])

  // ─── Course Actions ───────────────────────
  const loadCourse = useCallback(
    async (courseId: string) => {
      if (!tenantId) return
      dispatch({ type: 'LOAD_COURSE_START' })
      try {
        const { course, modules } = await builderCourseService.fetchCourseStructure(
          courseId,
          tenantId
        )
        dispatch({
          type: 'LOAD_COURSE_SUCCESS',
          course,
          modules,
        })
      } catch (err: unknown) {
        dispatch({ type: 'LOAD_COURSE_ERROR', error: (err as Error).message })
      }
    },
    [tenantId]
  )

  const publishCourse = async () => {
    if (!state.courseId || !tenantId) return

    // Validation guard: course must have at least one module and one lesson
    if (state.modules.length === 0) {
      toast('Gagal dipublish: Kursus harus memiliki setidaknya satu modul.', 'error')
      return
    }

    const hasLessons = state.modules.some((mod) => mod.lessons && mod.lessons.length > 0)
    if (!hasLessons) {
      toast('Gagal dipublish: Modul harus memiliki setidaknya satu pelajaran.', 'error')
      return
    }

    dispatch({ type: 'SET_SAVING', status: 'saving' })
    try {
      await builderCourseService.publishCourse(state.courseId, tenantId)
      dispatch({ type: 'SET_COURSE_STATUS', status: 'published' })
      dispatch({ type: 'SET_SAVING', status: 'saved' })
      toast('Kursus berhasil dipublish', 'success')
    } catch (error: unknown) {
      console.error('Failed to publish course:', error)
      dispatch({ type: 'SET_SAVING', status: 'error' })
      toast(error instanceof Error ? error.message : 'Gagal mempublish kursus', 'error')
    }
  }
  const draftCourse = useCallback(async () => {
    if (!state.courseId || !tenantId) return
    dispatch({ type: 'SET_SAVING', status: 'saving' })
    try {
      await builderCourseService.draftCourse(state.courseId, tenantId)
      dispatch({ type: 'SET_SAVING', status: 'saved' })
    } catch {
      dispatch({ type: 'SET_SAVING', status: 'error' })
    }
  }, [state.courseId, tenantId])

  // ─── Module Actions ───────────────────────
  const addModule = useCallback(
    async (title: string) => {
      if (!state.courseId || !tenantId) return
      try {
        const mod = await builderModuleService.createModule(state.courseId, title, tenantId)
        dispatch({ type: 'ADD_MODULE', module: mod })
      } catch (err: unknown) {
        console.error('Failed to add module:', err)
        toast(
          'Gagal menambah modul: ' + (err instanceof Error ? err.message : 'Unknown error'),
          'error'
        )
      }
    },
    [state.courseId, tenantId, toast]
  )

  const updateModule = useCallback(
    async (moduleId: string, data: { title?: string; description?: string }) => {
      if (!tenantId) return
      dispatch({ type: 'UPDATE_MODULE', moduleId, data })
      dispatch({ type: 'SET_SAVING', status: 'saving' })
      try {
        await builderModuleService.updateModule(moduleId, tenantId, data)
        dispatch({ type: 'SET_SAVING', status: 'saved' })
      } catch {
        dispatch({ type: 'SET_SAVING', status: 'error' })
      }
    },
    [tenantId]
  )

  const deleteModule = useCallback(
    async (moduleId: string) => {
      if (!tenantId) return
      dispatch({ type: 'DELETE_MODULE', moduleId })
      try {
        await builderModuleService.deleteModule(moduleId, tenantId)
      } catch (err: unknown) {
        console.error('Failed to delete module:', err)
        toast(
          'Gagal menghapus modul: ' + (err instanceof Error ? err.message : 'Unknown error'),
          'error'
        )
      }
    },
    [tenantId, toast]
  )

  const reorderModules = useCallback(
    async (moduleIds: string[]) => {
      if (!state.courseId || !tenantId) return

      const previousModules = state.modules // Save for explicit rollback

      // Optimistic update
      const reordered = moduleIds.map((id, idx) => {
        const mod = state.modules.find((m) => m.id === id)!
        return { ...mod, orderIndex: idx }
      })
      dispatch({ type: 'SET_MODULES', modules: reordered })

      try {
        await builderModuleService.reorderModules(state.courseId, moduleIds, tenantId)
      } catch (error: unknown) {
        console.error('Failed to reorder modules', error)
        dispatch({ type: 'SET_MODULES', modules: previousModules }) // Rollback
        toast(
          'Gagal mengubah urutan modul: ' +
            (error instanceof Error ? error.message : 'Unknown error'),
          'error'
        )
      }
    },
    [state.modules, state.courseId, tenantId, toast]
  )

  // ─── Lesson Actions ───────────────────────
  const addLesson = useCallback(
    async (moduleId: string, type: string, title: string) => {
      if (!tenantId) return
      try {
        const lesson = await builderLessonService.createLesson(moduleId, type, title, tenantId)
        dispatch({ type: 'ADD_LESSON', moduleId, lesson })
      } catch (err: unknown) {
        console.error('Failed to add lesson:', err)
        toast(
          'Gagal menambah materi: ' + (err instanceof Error ? err.message : 'Unknown error'),
          'error'
        )
      }
    },
    [tenantId, toast]
  )

  const updateLessonAction = useCallback(
    async (lessonId: string, data: Partial<DomainLesson>) => {
      if (!tenantId) return
      dispatch({ type: 'UPDATE_LESSON', lessonId, data })
      dispatch({ type: 'SET_SAVING', status: 'saving' })
      try {
        await builderLessonService.updateLesson(lessonId, tenantId, data)
        dispatch({ type: 'SET_SAVING', status: 'saved' })
      } catch {
        dispatch({ type: 'SET_SAVING', status: 'error' })
      }
    },
    [tenantId]
  )

  const deleteLesson = useCallback(
    async (lessonId: string) => {
      if (!tenantId) return
      dispatch({ type: 'DELETE_LESSON', lessonId })
      try {
        await builderLessonService.deleteLesson(lessonId, tenantId)
      } catch (err: unknown) {
        console.error('Failed to delete lesson:', err)
        toast(
          'Gagal menghapus materi: ' + (err instanceof Error ? err.message : 'Unknown error'),
          'error'
        )
      }
    },
    [tenantId, toast]
  )

  const reorderLessons = useCallback(
    async (lessonIds: string[]) => {
      const previousModules = state.modules // Save for explicit rollback

      // Optimistic: reorder in the correct module
      dispatch({
        type: 'SET_MODULES',
        modules: state.modules.map((m) => {
          const isTargetModule = m.lessons.some((l) => lessonIds.includes(l.id))
          if (!isTargetModule) return m

          const newLessons = lessonIds
            .map((id) => m.lessons.find((l) => l.id === id))
            .filter(Boolean)
            .map((l, idx) => ({ ...l!, orderIndex: idx }))

          return { ...m, lessons: newLessons as DomainLesson[] }
        }),
      })

      // Find module ID
      const targetMod = state.modules.find((m) => m.lessons.some((l) => lessonIds.includes(l.id)))
      if (targetMod && tenantId) {
        try {
          await builderLessonService.reorderLessons(targetMod.id, lessonIds, tenantId)
        } catch (error: unknown) {
          console.error('Failed to reorder lessons', error)
          dispatch({ type: 'SET_MODULES', modules: previousModules }) // Rollback
          toast(
            'Gagal mengubah urutan materi: ' +
              (error instanceof Error ? error.message : 'Unknown error'),
            'error'
          )
        }
      }
    },
    [state.modules, tenantId, toast]
  )

  // ─── Lesson Selection (Staged Load) ───────
  const selectLesson = useCallback(
    async (lessonId: string) => {
      if (!tenantId) return
      dispatch({ type: 'LOAD_BLOCKS_START' })
      try {
        const blocks = await builderBlockService.fetchLessonBlocks(lessonId, tenantId)
        dispatch({ type: 'LOAD_BLOCKS_SUCCESS', lessonId, blocks })
      } catch (err) {
        console.error('Failed to load blocks:', err)
      }
    },
    [tenantId]
  )

  const closeLesson = useCallback(() => {
    dispatch({ type: 'CLOSE_LESSON' })
  }, [])

  // ─── Block Actions ────────────────────────
  const addBlock = useCallback(
    async (type: string) => {
      if (!state.activeLesson || !tenantId) return
      try {
        const block = await builderBlockService.createBlock(state.activeLesson.id, type, tenantId)
        dispatch({ type: 'ADD_BLOCK', block })
      } catch (err: unknown) {
        console.error('Failed to add block:', err)
        toast(
          'Gagal menambah konten: ' + (err instanceof Error ? err.message : 'Unknown error'),
          'error'
        )
      }
    },
    [state.activeLesson, tenantId, toast]
  )

  const updateBlock = useCallback(
    (blockId: string, data: Partial<DomainBlock>) => {
      if (!tenantId) return
      // Optimistic update immediately
      dispatch({ type: 'UPDATE_BLOCK', blockId, data })

      // Debounced save (2 seconds)
      const existing = saveTimerRef.current.get(blockId)
      if (existing) clearTimeout(existing)

      const timer = setTimeout(async () => {
        dispatch({ type: 'SET_SAVING', status: 'saving' })
        try {
          await builderBlockService.updateBlock(blockId, tenantId, data)
          dispatch({ type: 'SET_SAVING', status: 'saved' })
        } catch {
          dispatch({ type: 'SET_SAVING', status: 'error' })
        }
        saveTimerRef.current.delete(blockId)
      }, 2000)

      saveTimerRef.current.set(blockId, timer)
    },
    [tenantId]
  )

  const saveBlock = useCallback(
    async (blockId: string) => {
      if (!tenantId) return
      // Force immediate save (flush debounce)
      const existing = saveTimerRef.current.get(blockId)
      if (existing) clearTimeout(existing)
      saveTimerRef.current.delete(blockId)

      const block = state.activeLesson?.blocks.find((b) => b.id === blockId)
      if (!block) return

      dispatch({ type: 'SET_SAVING', status: 'saving' })
      try {
        await builderBlockService.updateBlock(blockId, tenantId, {
          content: block.content,
          url: block.url,
          title: block.title,
          metadata: block.metadata,
        })
        dispatch({ type: 'SET_SAVING', status: 'saved' })
      } catch {
        dispatch({ type: 'SET_SAVING', status: 'error' })
      }
    },
    [state.activeLesson, tenantId]
  )

  const deleteBlock = useCallback(
    async (blockId: string) => {
      if (!tenantId) return
      dispatch({ type: 'DELETE_BLOCK', blockId })
      try {
        await builderBlockService.deleteBlock(blockId, tenantId)
      } catch (err: unknown) {
        console.error('Failed to delete block:', err)
        toast(
          'Gagal menghapus konten: ' + (err instanceof Error ? err.message : 'Unknown error'),
          'error'
        )
      }
    },
    [tenantId, toast]
  )

  const reorderBlocks = useCallback(
    async (blockIds: string[]) => {
      if (!state.activeLesson) return

      const previousBlocks = state.activeLesson.blocks // Save for rollback

      const reordered = blockIds
        .map((id) => state.activeLesson!.blocks.find((b) => b.id === id))
        .filter(Boolean)
        .map((b, idx) => ({ ...b!, orderIndex: idx }))
      dispatch({ type: 'SET_BLOCKS', blocks: reordered as DomainBlock[] })

      try {
        await builderBlockService.reorderBlocks(state.activeLesson!.id, blockIds, tenantId!)
      } catch (error: unknown) {
        console.error('Failed to reorder blocks', error)
        dispatch({ type: 'SET_BLOCKS', blocks: previousBlocks }) // Rollback
        toast(
          'Gagal mengubah urutan konten: ' +
            (error instanceof Error ? error.message : 'Unknown error'),
          'error'
        )
      }
    },
    [state.activeLesson, tenantId, toast]
  )

  const selectBlock = useCallback((blockId: string | null) => {
    dispatch({ type: 'SET_ACTIVE_BLOCK', blockId })
  }, [])

  // ─── Flush all pending saves on unmount ───
  useEffect(() => {
    const timers = saveTimerRef.current
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
    }
  }, [])

  const value: BuilderContextValue = {
    state,
    actions: {
      loadCourse,
      publishCourse,
      draftCourse,
      addModule,
      updateModule,
      deleteModule,
      reorderModules,
      addLesson,
      updateLesson: updateLessonAction,
      deleteLesson,
      reorderLessons,
      selectLesson,
      closeLesson,
      addBlock,
      updateBlock,
      deleteBlock,
      reorderBlocks,
      selectBlock,
      saveBlock,
    },
  }

  return <BuilderContext.Provider value={value}>{children}</BuilderContext.Provider>
}

export function useBuilder() {
  const ctx = useContext(BuilderContext)
  if (!ctx) throw new Error('useBuilder must be used within BuilderProvider')
  return ctx
}
