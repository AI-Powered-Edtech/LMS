import { DomainBlock } from '@/src/shared/types/blockTypes'
import { DomainCourse } from '@/src/shared/types/courseTypes'
import { DomainLesson } from '@/src/shared/types/lessonTypes'
import { DomainModule } from '@/src/shared/types/moduleTypes'

// ============================================================
// State
// ============================================================

export interface BuilderState {
  courseId: string | null
  courseTitle: string
  courseDescription: string | null
  courseStatus: 'draft' | 'in_review' | 'approved' | 'published' | 'archived'
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
  // Undo/Redo history
  _history: UndoSnapshot[]
  _future: UndoSnapshot[]
}

/**
 * Snapshot of the undoable portion of state.
 * We only track structural changes (modules, lessons, blocks) —
 * NOT transient UI state (loading, saving, activeBlockId, etc.).
 */
interface UndoSnapshot {
  modules: DomainModule[]
  activeLesson: BuilderState['activeLesson']
}

const MAX_HISTORY = 50

export const initialBuilderState: BuilderState = {
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
  _history: [],
  _future: [],
}

// ============================================================
// Actions
// ============================================================

export type BuilderAction =
  | { type: 'LOAD_COURSE_START' }
  | { type: 'LOAD_COURSE_SUCCESS'; course: DomainCourse; modules: DomainModule[] }
  | { type: 'LOAD_COURSE_ERROR'; error: string }
  | {
      type: 'SET_COURSE_STATUS'
      status: 'draft' | 'in_review' | 'approved' | 'published' | 'archived'
    }
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
  | { type: 'UNDO' }
  | { type: 'REDO' }

// ============================================================
// Helpers
// ============================================================

function takeSnapshot(state: BuilderState): UndoSnapshot {
  return {
    modules: state.modules,
    activeLesson: state.activeLesson,
  }
}

/**
 * Actions that produce undoable structural changes.
 * UI-only actions (loading, saving, active selection) are excluded.
 */
const UNDOABLE_ACTIONS = new Set([
  'ADD_MODULE',
  'UPDATE_MODULE',
  'DELETE_MODULE',
  'SET_MODULES',
  'ADD_LESSON',
  'UPDATE_LESSON',
  'DELETE_LESSON',
  'ADD_BLOCK',
  'UPDATE_BLOCK',
  'DELETE_BLOCK',
  'SET_BLOCKS',
])

// ============================================================
// Core Reducer (no history logic)
// ============================================================

function coreReducer(state: BuilderState, action: BuilderAction): BuilderState {
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
// Public Reducer (with undo/redo wrapper)
// ============================================================

export function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  // Handle UNDO
  if (action.type === 'UNDO') {
    if (state._history.length === 0) return state
    const previous = state._history[state._history.length - 1]
    const currentSnapshot = takeSnapshot(state)
    return {
      ...state,
      modules: previous.modules,
      activeLesson: previous.activeLesson,
      _history: state._history.slice(0, -1),
      _future: [currentSnapshot, ...state._future].slice(0, MAX_HISTORY),
    }
  }

  // Handle REDO
  if (action.type === 'REDO') {
    if (state._future.length === 0) return state
    const next = state._future[0]
    const currentSnapshot = takeSnapshot(state)
    return {
      ...state,
      modules: next.modules,
      activeLesson: next.activeLesson,
      _history: [...state._history, currentSnapshot].slice(-MAX_HISTORY),
      _future: state._future.slice(1),
    }
  }

  // For undoable actions, push current state to history before applying
  if (UNDOABLE_ACTIONS.has(action.type)) {
    const snapshot = takeSnapshot(state)
    const nextState = coreReducer(state, action)
    return {
      ...nextState,
      _history: [...state._history, snapshot].slice(-MAX_HISTORY),
      _future: [], // clear redo stack on new action
    }
  }

  // Non-undoable actions pass through without touching history
  return coreReducer(state, action)
}
