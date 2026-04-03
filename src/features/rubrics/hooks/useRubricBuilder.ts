import { useCallback, useReducer } from 'react'

import type { Rubric, RubricCriterion, RubricInsert, RubricLevel } from '../types'

// ─── State ────────────────────────────────────────────────────────────────────

export interface RubricBuilderState {
  rubric: RubricInsert
  isDirty: boolean
  errors: Record<string, string>
}

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_TITLE'; payload: string }
  | { type: 'SET_DESCRIPTION'; payload: string }
  | { type: 'SET_TEMPLATE'; payload: boolean }
  | { type: 'ADD_CRITERION' }
  | { type: 'UPDATE_CRITERION'; payload: { id: string; updates: Partial<RubricCriterion> } }
  | { type: 'DELETE_CRITERION'; payload: string }
  | { type: 'REORDER_CRITERIA'; payload: RubricCriterion[] }
  | { type: 'ADD_LEVEL'; payload: string } // criterion id
  | {
      type: 'UPDATE_LEVEL'
      payload: { criterionId: string; levelId: string; updates: Partial<RubricLevel> }
    }
  | { type: 'DELETE_LEVEL'; payload: { criterionId: string; levelId: string } }
  | { type: 'LOAD_RUBRIC'; payload: Rubric }
  | { type: 'RESET' }

// ─── Default criterion / level factories ─────────────────────────────────────

function newCriterion(order: number): RubricCriterion {
  return {
    id: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: '',
    description: '',
    max_points: 10,
    order,
    levels: [
      {
        id: `lvl-${Date.now()}-0`,
        label: 'Kurang',
        description: '',
        points: 0,
        order: 0,
      },
      {
        id: `lvl-${Date.now()}-1`,
        label: 'Cukup',
        description: '',
        points: 5,
        order: 1,
      },
      {
        id: `lvl-${Date.now()}-2`,
        label: 'Baik',
        description: '',
        points: 10,
        order: 2,
      },
    ],
  }
}

function newLevel(order: number): RubricLevel {
  return {
    id: `lvl-${Date.now()}-${order}`,
    label: '',
    description: '',
    points: 0,
    order,
  }
}

// ─── Initial state ────────────────────────────────────────────────────────────

function makeInitialState(assignmentId?: string): RubricBuilderState {
  return {
    rubric: {
      assignment_id: assignmentId ?? null,
      title: '',
      description: '',
      is_template: false,
      created_by: '',
      criteria: [],
    },
    isDirty: false,
    errors: {},
  }
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: RubricBuilderState, action: Action): RubricBuilderState {
  switch (action.type) {
    case 'SET_TITLE':
      return {
        ...state,
        isDirty: true,
        rubric: { ...state.rubric, title: action.payload },
        errors: { ...state.errors, title: '' },
      }

    case 'SET_DESCRIPTION':
      return {
        ...state,
        isDirty: true,
        rubric: { ...state.rubric, description: action.payload },
      }

    case 'SET_TEMPLATE':
      return {
        ...state,
        isDirty: true,
        rubric: { ...state.rubric, is_template: action.payload },
      }

    case 'ADD_CRITERION': {
      const next = newCriterion(state.rubric.criteria.length)
      return {
        ...state,
        isDirty: true,
        rubric: {
          ...state.rubric,
          criteria: [...state.rubric.criteria, next],
        },
      }
    }

    case 'UPDATE_CRITERION': {
      const criteria = state.rubric.criteria.map((c) =>
        c.id === action.payload.id ? { ...c, ...action.payload.updates } : c
      )
      return {
        ...state,
        isDirty: true,
        rubric: { ...state.rubric, criteria },
      }
    }

    case 'DELETE_CRITERION': {
      const criteria = state.rubric.criteria
        .filter((c) => c.id !== action.payload)
        .map((c, i) => ({ ...c, order: i }))
      return {
        ...state,
        isDirty: true,
        rubric: { ...state.rubric, criteria },
      }
    }

    case 'REORDER_CRITERIA':
      return {
        ...state,
        isDirty: true,
        rubric: { ...state.rubric, criteria: action.payload },
      }

    case 'ADD_LEVEL': {
      const criteria = state.rubric.criteria.map((c) => {
        if (c.id !== action.payload) return c
        const level = newLevel(c.levels.length)
        return { ...c, levels: [...c.levels, level] }
      })
      return {
        ...state,
        isDirty: true,
        rubric: { ...state.rubric, criteria },
      }
    }

    case 'UPDATE_LEVEL': {
      const criteria = state.rubric.criteria.map((c) => {
        if (c.id !== action.payload.criterionId) return c
        const levels = c.levels.map((l) =>
          l.id === action.payload.levelId ? { ...l, ...action.payload.updates } : l
        )
        return { ...c, levels }
      })
      return {
        ...state,
        isDirty: true,
        rubric: { ...state.rubric, criteria },
      }
    }

    case 'DELETE_LEVEL': {
      const criteria = state.rubric.criteria.map((c) => {
        if (c.id !== action.payload.criterionId) return c
        const levels = c.levels
          .filter((l) => l.id !== action.payload.levelId)
          .map((l, i) => ({ ...l, order: i }))
        return { ...c, levels }
      })
      return {
        ...state,
        isDirty: true,
        rubric: { ...state.rubric, criteria },
      }
    }

    case 'LOAD_RUBRIC': {
      const {
        id: _id,
        tenant_id: _tid,
        created_at: _ca,
        total_points: _tp,
        ...insert
      } = action.payload
      return {
        ...makeInitialState(),
        rubric: insert,
        isDirty: false,
        errors: {},
      }
    }

    case 'RESET':
      return makeInitialState(state.rubric.assignment_id ?? undefined)

    default:
      return state
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRubricBuilder(assignmentId?: string) {
  const [state, dispatch] = useReducer(reducer, undefined, () => makeInitialState(assignmentId))

  const addCriterion = useCallback(() => dispatch({ type: 'ADD_CRITERION' }), [])

  const updateCriterion = useCallback(
    (id: string, updates: Partial<RubricCriterion>) =>
      dispatch({ type: 'UPDATE_CRITERION', payload: { id, updates } }),
    []
  )

  const deleteCriterion = useCallback(
    (id: string) => dispatch({ type: 'DELETE_CRITERION', payload: id }),
    []
  )

  const reorderCriteria = useCallback(
    (criteria: RubricCriterion[]) => dispatch({ type: 'REORDER_CRITERIA', payload: criteria }),
    []
  )

  const addLevel = useCallback(
    (criterionId: string) => dispatch({ type: 'ADD_LEVEL', payload: criterionId }),
    []
  )

  const updateLevel = useCallback(
    (criterionId: string, levelId: string, updates: Partial<RubricLevel>) =>
      dispatch({ type: 'UPDATE_LEVEL', payload: { criterionId, levelId, updates } }),
    []
  )

  const deleteLevel = useCallback(
    (criterionId: string, levelId: string) =>
      dispatch({ type: 'DELETE_LEVEL', payload: { criterionId, levelId } }),
    []
  )

  const loadRubric = useCallback(
    (rubric: Rubric) => dispatch({ type: 'LOAD_RUBRIC', payload: rubric }),
    []
  )

  const reset = useCallback(() => dispatch({ type: 'RESET' }), [])

  const setTitle = useCallback(
    (title: string) => dispatch({ type: 'SET_TITLE', payload: title }),
    []
  )

  const setDescription = useCallback(
    (description: string) => dispatch({ type: 'SET_DESCRIPTION', payload: description }),
    []
  )

  const setIsTemplate = useCallback(
    (value: boolean) => dispatch({ type: 'SET_TEMPLATE', payload: value }),
    []
  )

  return {
    state,
    dispatch,
    addCriterion,
    updateCriterion,
    deleteCriterion,
    reorderCriteria,
    addLevel,
    updateLevel,
    deleteLevel,
    loadRubric,
    reset,
    setTitle,
    setDescription,
    setIsTemplate,
  }
}
