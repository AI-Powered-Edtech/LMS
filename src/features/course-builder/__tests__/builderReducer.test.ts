import { describe, expect, it } from 'vitest'

import type { PathRule } from '@/features/adaptive-paths/types'
import type { DomainBlock } from '@/shared/types/blockTypes'
import type { DomainCourse } from '@/shared/types/courseTypes'
import type { DomainLesson } from '@/shared/types/lessonTypes'
import type { DomainModule } from '@/shared/types/moduleTypes'

import type { BuilderState } from '../builderReducer'
import { builderReducer, initialBuilderState } from '../builderReducer'

// ============================================================
// Mock data helpers
// ============================================================

function makeModule(overrides: Partial<DomainModule> = {}): DomainModule {
  return {
    id: 'mod-1',
    courseId: 'course-1',
    title: 'Module 1',
    orderIndex: 0,
    tenantId: 'tenant-1',
    lessons: [],
    ...overrides,
  }
}

function makeLesson(overrides: Partial<DomainLesson> = {}): DomainLesson {
  return {
    id: 'lesson-1',
    moduleId: 'mod-1',
    title: 'Lesson 1',
    type: 'video',
    orderIndex: 0,
    isPublished: false,
    durationMinutes: null,
    passingScore: null,
    tenantId: 'tenant-1',
    ...overrides,
  }
}

function makeBlock(overrides: Partial<DomainBlock> = {}): DomainBlock {
  return {
    id: 'block-1',
    lessonId: 'lesson-1',
    type: 'text',
    url: null,
    title: 'Block 1',
    content: 'Hello',
    metadata: {},
    orderIndex: 0,
    tenantId: 'tenant-1',
    ...overrides,
  }
}

function makeCourse(overrides: Partial<DomainCourse> = {}): DomainCourse {
  return {
    id: 'course-1',
    title: 'Test Course',
    description: 'A test course',
    status: 'draft',
    tenantId: 'tenant-1',
    publishedAt: null,
    updatedAt: null,
    ...overrides,
  }
}

function makePathRule(overrides: Partial<PathRule> = {}): PathRule {
  return {
    id: 'rule-1',
    course_id: 'course-1',
    source_lesson_id: 'lesson-1',
    condition_type: 'quiz_score_below',
    condition_value: { threshold: 70 },
    target_lesson_id: 'lesson-2',
    priority: 1,
    is_active: true,
    label: 'Remedial path',
    tenant_id: 'tenant-1',
    created_by: 'user-1',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeState(overrides: Partial<BuilderState> = {}): BuilderState {
  return { ...initialBuilderState, ...overrides }
}

// ============================================================
// Tests
// ============================================================

describe('builderReducer', () => {
  // ── 1. Initial state ──────────────────────────────────────

  describe('initial state', () => {
    it('should have correct default values', () => {
      expect(initialBuilderState).toEqual({
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
        pendingLessonId: null,
        error: null,
        pendingBlocksByLesson: {},
        pathRules: [],
        _history: [],
        _future: [],
      })
    })
  })

  // ── 2. Course loading ─────────────────────────────────────

  describe('LOAD_COURSE_START', () => {
    it('should set loadingCourse to true and clear error', () => {
      const state = makeState({ loadingCourse: false, error: 'some error' })
      const result = builderReducer(state, { type: 'LOAD_COURSE_START' })
      expect(result.loadingCourse).toBe(true)
      expect(result.error).toBeNull()
    })
  })

  describe('LOAD_COURSE_SUCCESS', () => {
    it('should populate state with course data', () => {
      const course = makeCourse({
        id: 'c1',
        title: 'Math',
        description: 'Math course',
        status: 'published',
      })
      const modules = [makeModule({ id: 'm1' })]
      const state = makeState()
      const result = builderReducer(state, {
        type: 'LOAD_COURSE_SUCCESS',
        course,
        modules,
      })
      expect(result.courseId).toBe('c1')
      expect(result.courseTitle).toBe('Math')
      expect(result.courseDescription).toBe('Math course')
      expect(result.courseStatus).toBe('published')
      expect(result.modules).toEqual(modules)
      expect(result.loadingCourse).toBe(false)
    })
  })

  describe('LOAD_COURSE_ERROR', () => {
    it('should set error and loadingCourse to false', () => {
      const state = makeState({ loadingCourse: true })
      const result = builderReducer(state, {
        type: 'LOAD_COURSE_ERROR',
        error: 'Network error',
      })
      expect(result.loadingCourse).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  // ── 3. Module operations ──────────────────────────────────

  describe('ADD_MODULE', () => {
    it('should add module and push to history', () => {
      const mod = makeModule({ id: 'mod-new' })
      const state = makeState()
      const result = builderReducer(state, { type: 'ADD_MODULE', module: mod })
      expect(result.modules).toHaveLength(1)
      expect(result.modules[0]).toEqual(mod)
      // history should have one snapshot
      expect(result._history).toHaveLength(1)
      expect(result._history[0].modules).toEqual([])
      // future should be cleared
      expect(result._future).toEqual([])
    })
  })

  describe('UPDATE_MODULE', () => {
    it('should update module and push to history', () => {
      const mod = makeModule({ id: 'mod-1', title: 'Old Title' })
      const state = makeState({ modules: [mod] })
      const result = builderReducer(state, {
        type: 'UPDATE_MODULE',
        moduleId: 'mod-1',
        data: { title: 'New Title' },
      })
      expect(result.modules[0].title).toBe('New Title')
      expect(result._history).toHaveLength(1)
      expect(result._history[0].modules[0].title).toBe('Old Title')
    })
  })

  describe('DELETE_MODULE', () => {
    it('should remove module and push to history', () => {
      const mod = makeModule({ id: 'mod-1' })
      const state = makeState({ modules: [mod] })
      const result = builderReducer(state, {
        type: 'DELETE_MODULE',
        moduleId: 'mod-1',
      })
      expect(result.modules).toHaveLength(0)
      expect(result._history).toHaveLength(1)
    })

    it('should clear activeLesson if it belonged to deleted module', () => {
      const lesson = makeLesson({ id: 'lesson-1' })
      const mod = makeModule({ id: 'mod-1', lessons: [lesson] })
      const state = makeState({
        modules: [mod],
        activeLesson: { id: 'lesson-1', blocks: [] },
      })
      const result = builderReducer(state, {
        type: 'DELETE_MODULE',
        moduleId: 'mod-1',
      })
      expect(result.activeLesson).toBeNull()
    })

    it('should NOT clear activeLesson if it belongs to a different module', () => {
      const lesson = makeLesson({ id: 'lesson-1', moduleId: 'mod-2' })
      const mod1 = makeModule({ id: 'mod-1', lessons: [] })
      const mod2 = makeModule({ id: 'mod-2', lessons: [lesson] })
      const state = makeState({
        modules: [mod1, mod2],
        activeLesson: { id: 'lesson-1', blocks: [] },
      })
      const result = builderReducer(state, {
        type: 'DELETE_MODULE',
        moduleId: 'mod-1',
      })
      expect(result.activeLesson).toEqual({ id: 'lesson-1', blocks: [] })
      expect(result.modules).toHaveLength(1)
      expect(result.modules[0].id).toBe('mod-2')
    })
  })

  // ── 4. Lesson operations ──────────────────────────────────

  describe('ADD_LESSON', () => {
    it('should add lesson to correct module and push to history', () => {
      const mod = makeModule({ id: 'mod-1', lessons: [] })
      const lesson = makeLesson({ id: 'lesson-new' })
      const state = makeState({ modules: [mod] })
      const result = builderReducer(state, {
        type: 'ADD_LESSON',
        moduleId: 'mod-1',
        lesson,
      })
      expect(result.modules[0].lessons).toHaveLength(1)
      expect(result.modules[0].lessons[0]).toEqual(lesson)
      expect(result._history).toHaveLength(1)
    })
  })

  describe('UPDATE_LESSON', () => {
    it('should update lesson data and push to history', () => {
      const lesson = makeLesson({ id: 'lesson-1', title: 'Old Title' })
      const mod = makeModule({ id: 'mod-1', lessons: [lesson] })
      const state = makeState({ modules: [mod] })
      const result = builderReducer(state, {
        type: 'UPDATE_LESSON',
        lessonId: 'lesson-1',
        data: { title: 'New Title' },
      })
      expect(result.modules[0].lessons[0].title).toBe('New Title')
      expect(result._history).toHaveLength(1)
    })
  })

  describe('DELETE_LESSON', () => {
    it('should remove lesson and push to history', () => {
      const lesson = makeLesson({ id: 'lesson-1' })
      const mod = makeModule({ id: 'mod-1', lessons: [lesson] })
      const state = makeState({ modules: [mod] })
      const result = builderReducer(state, {
        type: 'DELETE_LESSON',
        lessonId: 'lesson-1',
      })
      expect(result.modules[0].lessons).toHaveLength(0)
      expect(result._history).toHaveLength(1)
    })

    it('should clear activeLesson if matching', () => {
      const lesson = makeLesson({ id: 'lesson-1' })
      const mod = makeModule({ id: 'mod-1', lessons: [lesson] })
      const state = makeState({
        modules: [mod],
        activeLesson: { id: 'lesson-1', blocks: [] },
      })
      const result = builderReducer(state, {
        type: 'DELETE_LESSON',
        lessonId: 'lesson-1',
      })
      expect(result.activeLesson).toBeNull()
    })

    it('should NOT clear activeLesson if not matching', () => {
      const lesson1 = makeLesson({ id: 'lesson-1' })
      const lesson2 = makeLesson({ id: 'lesson-2' })
      const mod = makeModule({ id: 'mod-1', lessons: [lesson1, lesson2] })
      const state = makeState({
        modules: [mod],
        activeLesson: { id: 'lesson-2', blocks: [] },
      })
      const result = builderReducer(state, {
        type: 'DELETE_LESSON',
        lessonId: 'lesson-1',
      })
      expect(result.activeLesson).toEqual({ id: 'lesson-2', blocks: [] })
    })
  })

  // ── 5. Block operations ───────────────────────────────────

  describe('ADD_BLOCK', () => {
    it('should add block to active lesson and push to history', () => {
      const block = makeBlock({ id: 'block-new' })
      const state = makeState({
        activeLesson: { id: 'lesson-1', blocks: [] },
      })
      const result = builderReducer(state, { type: 'ADD_BLOCK', block })
      expect(result.activeLesson?.blocks).toHaveLength(1)
      expect(result.activeLesson?.blocks[0]).toEqual(block)
      expect(result._history).toHaveLength(1)
    })

    it('should return state unchanged if no active lesson', () => {
      const block = makeBlock({ id: 'block-new' })
      const state = makeState({ activeLesson: null })
      const result = builderReducer(state, { type: 'ADD_BLOCK', block })
      // coreReducer returns same state, but wrapper still pushes to history
      expect(result.activeLesson).toBeNull()
      expect(result.modules).toEqual(state.modules)
      expect(result._history).toHaveLength(1)
    })
  })

  describe('UPDATE_BLOCK', () => {
    it('should update block data and push to history', () => {
      const block = makeBlock({ id: 'block-1', title: 'Old' })
      const state = makeState({
        activeLesson: { id: 'lesson-1', blocks: [block] },
      })
      const result = builderReducer(state, {
        type: 'UPDATE_BLOCK',
        blockId: 'block-1',
        data: { title: 'New' },
      })
      expect(result.activeLesson?.blocks[0].title).toBe('New')
      expect(result._history).toHaveLength(1)
    })

    it('should return state unchanged if no active lesson', () => {
      const state = makeState({ activeLesson: null })
      const result = builderReducer(state, {
        type: 'UPDATE_BLOCK',
        blockId: 'block-1',
        data: { title: 'New' },
      })
      // coreReducer returns same state, but wrapper still pushes to history
      expect(result.activeLesson).toBeNull()
      expect(result.modules).toEqual(state.modules)
      expect(result._history).toHaveLength(1)
    })
  })

  describe('DELETE_BLOCK', () => {
    it('should remove block and push to history', () => {
      const block = makeBlock({ id: 'block-1' })
      const state = makeState({
        activeLesson: { id: 'lesson-1', blocks: [block] },
      })
      const result = builderReducer(state, {
        type: 'DELETE_BLOCK',
        blockId: 'block-1',
      })
      expect(result.activeLesson?.blocks).toHaveLength(0)
      expect(result._history).toHaveLength(1)
    })

    it('should clear activeBlockId if matching', () => {
      const block = makeBlock({ id: 'block-1' })
      const state = makeState({
        activeLesson: { id: 'lesson-1', blocks: [block] },
        activeBlockId: 'block-1',
      })
      const result = builderReducer(state, {
        type: 'DELETE_BLOCK',
        blockId: 'block-1',
      })
      expect(result.activeBlockId).toBeNull()
    })

    it('should NOT clear activeBlockId if not matching', () => {
      const block1 = makeBlock({ id: 'block-1' })
      const block2 = makeBlock({ id: 'block-2' })
      const state = makeState({
        activeLesson: { id: 'lesson-1', blocks: [block1, block2] },
        activeBlockId: 'block-2',
      })
      const result = builderReducer(state, {
        type: 'DELETE_BLOCK',
        blockId: 'block-1',
      })
      expect(result.activeBlockId).toBe('block-2')
    })

    it('should return state unchanged if no active lesson', () => {
      const state = makeState({ activeLesson: null })
      const result = builderReducer(state, {
        type: 'DELETE_BLOCK',
        blockId: 'block-1',
      })
      // coreReducer returns same state, but wrapper still pushes to history
      expect(result.activeLesson).toBeNull()
      expect(result.modules).toEqual(state.modules)
      expect(result._history).toHaveLength(1)
    })
  })

  // ── 6. Undo/Redo ──────────────────────────────────────────

  describe('UNDO', () => {
    it('should restore previous state from history', () => {
      const mod = makeModule({ id: 'mod-1', title: 'Original' })
      const state0 = makeState()
      const state1 = builderReducer(state0, { type: 'ADD_MODULE', module: mod })
      const state2 = builderReducer(state1, {
        type: 'UPDATE_MODULE',
        moduleId: 'mod-1',
        data: { title: 'Updated' },
      })
      // state2 has updated title, history has 2 snapshots
      expect(state2.modules[0].title).toBe('Updated')
      expect(state2._history).toHaveLength(2)

      const undone = builderReducer(state2, { type: 'UNDO' })
      expect(undone.modules[0].title).toBe('Original')
      expect(undone._history).toHaveLength(1)
      expect(undone._future).toHaveLength(1)
    })

    it('should return same state when history is empty', () => {
      const state = makeState()
      const result = builderReducer(state, { type: 'UNDO' })
      expect(result).toBe(state)
    })
  })

  describe('REDO', () => {
    it('should restore next state from future', () => {
      const mod = makeModule({ id: 'mod-1', title: 'Original' })
      const state0 = makeState()
      const state1 = builderReducer(state0, { type: 'ADD_MODULE', module: mod })
      const state2 = builderReducer(state1, {
        type: 'UPDATE_MODULE',
        moduleId: 'mod-1',
        data: { title: 'Updated' },
      })
      const undone = builderReducer(state2, { type: 'UNDO' })
      expect(undone.modules[0].title).toBe('Original')
      expect(undone._future).toHaveLength(1)

      const redone = builderReducer(undone, { type: 'REDO' })
      expect(redone.modules[0].title).toBe('Updated')
      expect(redone._future).toHaveLength(0)
      expect(redone._history).toHaveLength(2)
    })

    it('should return same state when future is empty', () => {
      const state = makeState()
      const result = builderReducer(state, { type: 'REDO' })
      expect(result).toBe(state)
    })
  })

  describe('new action clears redo stack', () => {
    it('should clear _future when a new undoable action is dispatched', () => {
      const mod = makeModule({ id: 'mod-1' })
      const state0 = makeState()
      const state1 = builderReducer(state0, { type: 'ADD_MODULE', module: mod })
      const state2 = builderReducer(state1, {
        type: 'UPDATE_MODULE',
        moduleId: 'mod-1',
        data: { title: 'Updated' },
      })
      const undone = builderReducer(state2, { type: 'UNDO' })
      expect(undone._future).toHaveLength(1)

      // New action should clear redo stack
      const newState = builderReducer(undone, {
        type: 'ADD_MODULE',
        module: makeModule({ id: 'mod-2' }),
      })
      expect(newState._future).toEqual([])
      expect(newState._history).toHaveLength(2)
    })
  })

  // ── 7. Race guard for pendingLessonId ─────────────────────

  describe('LOAD_BLOCKS_START', () => {
    it('should set pendingLessonId and loadingBlocks', () => {
      const state = makeState()
      const result = builderReducer(state, {
        type: 'LOAD_BLOCKS_START',
        lessonId: 'lesson-1',
      })
      expect(result.pendingLessonId).toBe('lesson-1')
      expect(result.loadingBlocks).toBe(true)
    })
  })

  describe('LOAD_BLOCKS_SUCCESS race guard', () => {
    it('should ignore stale response if pendingLessonId differs', () => {
      const state = makeState({ pendingLessonId: 'lesson-2' })
      const result = builderReducer(state, {
        type: 'LOAD_BLOCKS_SUCCESS',
        lessonId: 'lesson-1',
        blocks: [makeBlock()],
      })
      // Should return same state reference (no changes)
      expect(result).toBe(state)
    })

    it('should process response if pendingLessonId matches', () => {
      const blocks = [makeBlock({ id: 'block-1' })]
      const state = makeState({ pendingLessonId: 'lesson-1' })
      const result = builderReducer(state, {
        type: 'LOAD_BLOCKS_SUCCESS',
        lessonId: 'lesson-1',
        blocks,
      })
      expect(result.activeLesson).toEqual({ id: 'lesson-1', blocks })
      expect(result.loadingBlocks).toBe(false)
      expect(result.pendingLessonId).toBeNull()
      expect(result.activeBlockId).toBeNull()
    })

    it('should process response if pendingLessonId is null (no pending request)', () => {
      const blocks = [makeBlock({ id: 'block-1' })]
      const state = makeState({ pendingLessonId: null })
      const result = builderReducer(state, {
        type: 'LOAD_BLOCKS_SUCCESS',
        lessonId: 'lesson-1',
        blocks,
      })
      expect(result.activeLesson).toEqual({ id: 'lesson-1', blocks })
      expect(result.pendingLessonId).toBeNull()
    })

    it('should clear pendingLessonId after processing', () => {
      const state = makeState({ pendingLessonId: 'lesson-1' })
      const result = builderReducer(state, {
        type: 'LOAD_BLOCKS_SUCCESS',
        lessonId: 'lesson-1',
        blocks: [],
      })
      expect(result.pendingLessonId).toBeNull()
    })
  })

  describe('LOAD_BLOCKS_ERROR', () => {
    it('should clear loadingBlocks, pendingLessonId, and set error', () => {
      const state = makeState({
        loadingBlocks: true,
        pendingLessonId: 'lesson-1',
      })
      const result = builderReducer(state, {
        type: 'LOAD_BLOCKS_ERROR',
        error: 'Failed to load',
      })
      expect(result.loadingBlocks).toBe(false)
      expect(result.pendingLessonId).toBeNull()
      expect(result.error).toBe('Failed to load')
    })
  })

  // ── 8. Remote collaborative actions ───────────────────────

  describe('REMOTE_ADD_MODULE', () => {
    it('should add module without affecting history', () => {
      const state = makeState({ _history: [{ modules: [], activeLesson: null }] })
      const mod = makeModule({ id: 'mod-remote' })
      const result = builderReducer(state, {
        type: 'REMOTE_ADD_MODULE',
        module: mod,
      })
      expect(result.modules).toHaveLength(1)
      expect(result._history).toEqual(state._history)
      expect(result._future).toEqual([])
    })
  })

  describe('REMOTE_UPDATE_MODULE', () => {
    it('should update module without affecting history', () => {
      const mod = makeModule({ id: 'mod-1', title: 'Old' })
      const state = makeState({
        modules: [mod],
        _history: [{ modules: [mod], activeLesson: null }],
      })
      const result = builderReducer(state, {
        type: 'REMOTE_UPDATE_MODULE',
        moduleId: 'mod-1',
        data: { title: 'Remote' },
      })
      expect(result.modules[0].title).toBe('Remote')
      expect(result._history).toEqual(state._history)
    })
  })

  describe('REMOTE_DELETE_MODULE', () => {
    it('should remove module without affecting history', () => {
      const mod = makeModule({ id: 'mod-1' })
      const state = makeState({
        modules: [mod],
        _history: [{ modules: [mod], activeLesson: null }],
      })
      const result = builderReducer(state, {
        type: 'REMOTE_DELETE_MODULE',
        moduleId: 'mod-1',
      })
      expect(result.modules).toHaveLength(0)
      expect(result._history).toEqual(state._history)
    })
  })

  describe('REMOTE_SET_MODULES', () => {
    it('should replace modules without affecting history', () => {
      const state = makeState({
        modules: [makeModule({ id: 'mod-1' })],
        _history: [{ modules: [], activeLesson: null }],
      })
      const newMods = [makeModule({ id: 'mod-new' })]
      const result = builderReducer(state, {
        type: 'REMOTE_SET_MODULES',
        modules: newMods,
      })
      expect(result.modules).toEqual(newMods)
      expect(result._history).toEqual(state._history)
    })
  })

  describe('REMOTE_ADD_LESSON', () => {
    it('should add lesson without affecting history', () => {
      const mod = makeModule({ id: 'mod-1', lessons: [] })
      const lesson = makeLesson({ id: 'lesson-remote' })
      const state = makeState({
        modules: [mod],
        _history: [{ modules: [mod], activeLesson: null }],
      })
      const result = builderReducer(state, {
        type: 'REMOTE_ADD_LESSON',
        moduleId: 'mod-1',
        lesson,
      })
      expect(result.modules[0].lessons).toHaveLength(1)
      expect(result._history).toEqual(state._history)
    })
  })

  describe('REMOTE_UPDATE_LESSON', () => {
    it('should update lesson without affecting history', () => {
      const lesson = makeLesson({ id: 'lesson-1', title: 'Old' })
      const mod = makeModule({ id: 'mod-1', lessons: [lesson] })
      const state = makeState({
        modules: [mod],
        _history: [{ modules: [mod], activeLesson: null }],
      })
      const result = builderReducer(state, {
        type: 'REMOTE_UPDATE_LESSON',
        lessonId: 'lesson-1',
        data: { title: 'Remote' },
      })
      expect(result.modules[0].lessons[0].title).toBe('Remote')
      expect(result._history).toEqual(state._history)
    })
  })

  describe('REMOTE_DELETE_LESSON', () => {
    it('should remove lesson without affecting history', () => {
      const lesson = makeLesson({ id: 'lesson-1' })
      const mod = makeModule({ id: 'mod-1', lessons: [lesson] })
      const state = makeState({
        modules: [mod],
        _history: [{ modules: [mod], activeLesson: null }],
      })
      const result = builderReducer(state, {
        type: 'REMOTE_DELETE_LESSON',
        lessonId: 'lesson-1',
      })
      expect(result.modules[0].lessons).toHaveLength(0)
      expect(result._history).toEqual(state._history)
    })
  })

  describe('REMOTE_ADD_BLOCK', () => {
    it('should add block without affecting history', () => {
      const block = makeBlock({ id: 'block-remote' })
      const state = makeState({
        activeLesson: { id: 'lesson-1', blocks: [] },
        _history: [{ modules: [], activeLesson: null }],
      })
      const result = builderReducer(state, {
        type: 'REMOTE_ADD_BLOCK',
        block,
      })
      expect(result.activeLesson?.blocks).toHaveLength(1)
      expect(result._history).toEqual(state._history)
    })
  })

  describe('REMOTE_UPDATE_BLOCK', () => {
    it('should update block without affecting history', () => {
      const block = makeBlock({ id: 'block-1', title: 'Old' })
      const state = makeState({
        activeLesson: { id: 'lesson-1', blocks: [block] },
        _history: [{ modules: [], activeLesson: { id: 'lesson-1', blocks: [block] } }],
      })
      const result = builderReducer(state, {
        type: 'REMOTE_UPDATE_BLOCK',
        blockId: 'block-1',
        data: { title: 'Remote' },
      })
      expect(result.activeLesson?.blocks[0].title).toBe('Remote')
      expect(result._history).toEqual(state._history)
    })
  })

  describe('REMOTE_DELETE_BLOCK', () => {
    it('should remove block without affecting history', () => {
      const block = makeBlock({ id: 'block-1' })
      const state = makeState({
        activeLesson: { id: 'lesson-1', blocks: [block] },
        _history: [{ modules: [], activeLesson: { id: 'lesson-1', blocks: [block] } }],
      })
      const result = builderReducer(state, {
        type: 'REMOTE_DELETE_BLOCK',
        blockId: 'block-1',
      })
      expect(result.activeLesson?.blocks).toHaveLength(0)
      expect(result._history).toEqual(state._history)
    })
  })

  describe('REMOTE_SET_BLOCKS', () => {
    it('should replace blocks without affecting history', () => {
      const state = makeState({
        activeLesson: { id: 'lesson-1', blocks: [makeBlock({ id: 'block-1' })] },
        _history: [{ modules: [], activeLesson: null }],
      })
      const newBlocks = [makeBlock({ id: 'block-new' })]
      const result = builderReducer(state, {
        type: 'REMOTE_SET_BLOCKS',
        blocks: newBlocks,
      })
      expect(result.activeLesson?.blocks).toEqual(newBlocks)
      expect(result._history).toEqual(state._history)
    })
  })

  // ── 9. Adaptive path rules (non-undoable) ─────────────────

  describe('ADD_PATH_RULE', () => {
    it('should add rule without affecting undo/redo history', () => {
      const rule = makePathRule({ id: 'rule-1' })
      const state = makeState({ _history: [{ modules: [], activeLesson: null }] })
      const result = builderReducer(state, { type: 'ADD_PATH_RULE', rule })
      expect(result.pathRules).toHaveLength(1)
      expect(result.pathRules[0]).toEqual(rule)
      expect(result._history).toEqual(state._history)
    })
  })

  describe('UPDATE_PATH_RULE', () => {
    it('should update rule without affecting undo/redo history', () => {
      const rule = makePathRule({ id: 'rule-1', label: 'Old' })
      const state = makeState({
        pathRules: [rule],
        _history: [{ modules: [], activeLesson: null }],
      })
      const result = builderReducer(state, {
        type: 'UPDATE_PATH_RULE',
        ruleId: 'rule-1',
        data: { label: 'New' },
      })
      expect(result.pathRules[0].label).toBe('New')
      expect(result._history).toEqual(state._history)
    })
  })

  describe('DELETE_PATH_RULE', () => {
    it('should remove rule without affecting undo/redo history', () => {
      const rule = makePathRule({ id: 'rule-1' })
      const state = makeState({
        pathRules: [rule],
        _history: [{ modules: [], activeLesson: null }],
      })
      const result = builderReducer(state, {
        type: 'DELETE_PATH_RULE',
        ruleId: 'rule-1',
      })
      expect(result.pathRules).toHaveLength(0)
      expect(result._history).toEqual(state._history)
    })
  })

  // ── 10. SET_LESSON_REMEDIAL ──────────────────────────────

  describe('SET_LESSON_REMEDIAL', () => {
    it('should set is_remedial flag on lesson', () => {
      const lesson = makeLesson({
        id: 'lesson-1',
        is_remedial: false,
      } as Partial<DomainLesson>) as DomainLesson
      const mod = makeModule({ id: 'mod-1', lessons: [lesson] })
      const state = makeState({ modules: [mod] })
      const result = builderReducer(state, {
        type: 'SET_LESSON_REMEDIAL',
        lessonId: 'lesson-1',
        isRemedial: true,
      })
      expect(result.modules[0].lessons[0].is_remedial).toBe(true)
    })

    it('should NOT affect undo/redo history', () => {
      const lesson = makeLesson({ id: 'lesson-1' })
      const mod = makeModule({ id: 'mod-1', lessons: [lesson] })
      const state = makeState({
        modules: [mod],
        _history: [{ modules: [mod], activeLesson: null }],
      })
      const result = builderReducer(state, {
        type: 'SET_LESSON_REMEDIAL',
        lessonId: 'lesson-1',
        isRemedial: true,
      })
      expect(result._history).toEqual(state._history)
      expect(result._future).toEqual([])
    })
  })

  // ── 11. Other actions ─────────────────────────────────────

  describe('SET_COURSE_STATUS', () => {
    it('should update course status', () => {
      const state = makeState({ courseStatus: 'draft' })
      const result = builderReducer(state, {
        type: 'SET_COURSE_STATUS',
        status: 'published',
      })
      expect(result.courseStatus).toBe('published')
    })
  })

  describe('SET_MODULES', () => {
    it('should replace modules', () => {
      const state = makeState({ modules: [makeModule({ id: 'mod-1' })] })
      const newMods = [makeModule({ id: 'mod-2' }), makeModule({ id: 'mod-3' })]
      const result = builderReducer(state, {
        type: 'SET_MODULES',
        modules: newMods,
      })
      expect(result.modules).toEqual(newMods)
    })
  })

  describe('SET_BLOCKS', () => {
    it('should replace blocks in active lesson', () => {
      const state = makeState({
        activeLesson: { id: 'lesson-1', blocks: [makeBlock({ id: 'block-1' })] },
      })
      const newBlocks = [makeBlock({ id: 'block-2' }), makeBlock({ id: 'block-3' })]
      const result = builderReducer(state, {
        type: 'SET_BLOCKS',
        blocks: newBlocks,
      })
      expect(result.activeLesson?.blocks).toEqual(newBlocks)
    })

    it('should return state unchanged if no active lesson', () => {
      const state = makeState({ activeLesson: null })
      const result = builderReducer(state, {
        type: 'SET_BLOCKS',
        blocks: [makeBlock()],
      })
      // coreReducer returns same state, but wrapper still pushes to history
      expect(result.activeLesson).toBeNull()
      expect(result.modules).toEqual(state.modules)
      expect(result._history).toHaveLength(1)
    })
  })

  describe('SET_ACTIVE_BLOCK', () => {
    it('should set activeBlockId', () => {
      const state = makeState({ activeBlockId: null })
      const result = builderReducer(state, {
        type: 'SET_ACTIVE_BLOCK',
        blockId: 'block-1',
      })
      expect(result.activeBlockId).toBe('block-1')
    })
  })

  describe('CLOSE_LESSON', () => {
    it('should clear activeLesson, activeBlockId, and pendingLessonId', () => {
      const state = makeState({
        activeLesson: { id: 'lesson-1', blocks: [] },
        activeBlockId: 'block-1',
        pendingLessonId: 'lesson-1',
      })
      const result = builderReducer(state, { type: 'CLOSE_LESSON' })
      expect(result.activeLesson).toBeNull()
      expect(result.activeBlockId).toBeNull()
      expect(result.pendingLessonId).toBeNull()
    })
  })

  // ── 13. pendingBlocksByLesson (offline block tracking) ────

  describe('pendingBlocksByLesson (offline block tracking)', () => {
    it('CLOSE_LESSON with blocks saves blocks to pendingBlocksByLesson', () => {
      const block = makeBlock({ id: 'block-1' })
      const state = makeState({
        activeLesson: { id: 'lesson-1', blocks: [block] },
      })
      const result = builderReducer(state, { type: 'CLOSE_LESSON' })
      expect(result.activeLesson).toBeNull()
      expect(result.pendingBlocksByLesson).toEqual({ 'lesson-1': [block] })
    })

    it('CLOSE_LESSON with empty blocks does NOT save to pendingBlocksByLesson', () => {
      const state = makeState({
        activeLesson: { id: 'lesson-1', blocks: [] },
      })
      const result = builderReducer(state, { type: 'CLOSE_LESSON' })
      expect(result.activeLesson).toBeNull()
      expect(result.pendingBlocksByLesson).toEqual({})
    })

    it('CLOSE_LESSON with null activeLesson does nothing to pendingBlocksByLesson', () => {
      const state = makeState({ activeLesson: null })
      const result = builderReducer(state, { type: 'CLOSE_LESSON' })
      expect(result.activeLesson).toBeNull()
      expect(result.pendingBlocksByLesson).toEqual({})
    })

    it('LOAD_BLOCKS_SUCCESS removes lesson from pendingBlocksByLesson', () => {
      const block = makeBlock({ id: 'block-1' })
      const state = makeState({
        pendingLessonId: 'lesson-1',
        pendingBlocksByLesson: { 'lesson-1': [block] },
      })
      const freshBlocks = [makeBlock({ id: 'block-fresh' })]
      const result = builderReducer(state, {
        type: 'LOAD_BLOCKS_SUCCESS',
        lessonId: 'lesson-1',
        blocks: freshBlocks,
      })
      expect(result.activeLesson).toEqual({ id: 'lesson-1', blocks: freshBlocks })
      expect(result.pendingBlocksByLesson).toEqual({})
    })

    it('LOAD_BLOCKS_SUCCESS only removes the loaded lesson, not others', () => {
      const blockA = makeBlock({ id: 'block-a', lessonId: 'lesson-a' })
      const blockB = makeBlock({ id: 'block-b', lessonId: 'lesson-b' })
      const state = makeState({
        pendingLessonId: 'lesson-a',
        pendingBlocksByLesson: {
          'lesson-a': [blockA],
          'lesson-b': [blockB],
        },
      })
      const result = builderReducer(state, {
        type: 'LOAD_BLOCKS_SUCCESS',
        lessonId: 'lesson-a',
        blocks: [],
      })
      expect(result.pendingBlocksByLesson).toEqual({ 'lesson-b': [blockB] })
      expect('lesson-a' in result.pendingBlocksByLesson).toBe(false)
    })

    it('pendingBlocksByLesson accumulates across multiple lesson closes', () => {
      const blockA = makeBlock({ id: 'block-a', lessonId: 'lesson-a' })
      const blockB = makeBlock({ id: 'block-b', lessonId: 'lesson-b' })

      // Close lesson A
      const state1 = makeState({ activeLesson: { id: 'lesson-a', blocks: [blockA] } })
      const after1 = builderReducer(state1, { type: 'CLOSE_LESSON' })
      expect(after1.pendingBlocksByLesson).toEqual({ 'lesson-a': [blockA] })

      // Open then close lesson B (simulate loading then closing)
      const state2 = { ...after1, activeLesson: { id: 'lesson-b', blocks: [blockB] } }
      const after2 = builderReducer(state2, { type: 'CLOSE_LESSON' })
      expect(after2.pendingBlocksByLesson).toEqual({
        'lesson-a': [blockA],
        'lesson-b': [blockB],
      })
    })

    it('CLOSE_LESSON does NOT push to undo history', () => {
      const block = makeBlock({ id: 'block-1' })
      const state = makeState({
        activeLesson: { id: 'lesson-1', blocks: [block] },
        _history: [],
      })
      const result = builderReducer(state, { type: 'CLOSE_LESSON' })
      // CLOSE_LESSON is not in UNDOABLE_ACTIONS — history must remain unchanged
      expect(result._history).toEqual([])
    })
  })

  describe('SET_SAVING', () => {
    it('should update savingStatus', () => {
      const state = makeState({ savingStatus: 'idle' })
      const result = builderReducer(state, { type: 'SET_SAVING', status: 'saving' })
      expect(result.savingStatus).toBe('saving')
    })
  })

  // ── 12. Undo/Redo with MAX_HISTORY limit ──────────────────

  describe('undo/redo MAX_HISTORY limit', () => {
    it('should limit history to MAX_HISTORY entries', () => {
      let state = makeState()
      // Add more than 50 modules
      for (let i = 0; i < 55; i++) {
        state = builderReducer(state, {
          type: 'ADD_MODULE',
          module: makeModule({ id: `mod-${i}` }),
        })
      }
      expect(state._history).toHaveLength(50)
    })

    it('should limit future to MAX_HISTORY entries', () => {
      let state = makeState()
      // Build up history
      for (let i = 0; i < 55; i++) {
        state = builderReducer(state, {
          type: 'ADD_MODULE',
          module: makeModule({ id: `mod-${i}` }),
        })
      }
      expect(state._history).toHaveLength(50)

      // Undo many times to fill future
      for (let i = 0; i < 55; i++) {
        state = builderReducer(state, { type: 'UNDO' })
      }
      expect(state._future).toHaveLength(50)
    })
  })
})
