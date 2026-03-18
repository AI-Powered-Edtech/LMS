import { useReducer, useCallback, useMemo } from 'react';
import { Lesson, LessonProgress } from '@/src/features/lessons';

// ============================================================
// State
// ============================================================

export type ViewerStatus = 'idle' | 'loading' | 'viewing' | 'in_progress' | 'completing' | 'completed' | 'error';

export interface ViewerState {
    status: ViewerStatus;
    lesson: Lesson | null;
    progress: LessonProgress | null;
    progressPercentage: number;
    lastPosition: number;
    error: string | null;
}

const initialState: ViewerState = {
    status: 'idle',
    lesson: null,
    progress: null,
    progressPercentage: 0,
    lastPosition: 0,
    error: null,
};

// ============================================================
// Actions
// ============================================================

type ViewerAction =
    | { type: 'LOAD_LESSON' }
    | { type: 'LESSON_LOADED'; lesson: Lesson; progress: LessonProgress | null }
    | { type: 'LOAD_ERROR'; error: string }
    | { type: 'START_VIEWING' }
    | { type: 'UPDATE_PROGRESS'; percentage: number; position?: number }
    | { type: 'COMPLETION_MET' }
    | { type: 'COMPLETED' }
    | { type: 'RETRY' }
    | { type: 'RESET' };

// ============================================================
// Reducer
// ============================================================

function viewerReducer(state: ViewerState, action: ViewerAction): ViewerState {
    switch (action.type) {
        case 'LOAD_LESSON':
            return { ...state, status: 'loading', error: null };

        case 'LESSON_LOADED': {
            const savedProgress = action.progress;
            const isAlreadyCompleted = savedProgress?.status === 'completed';
            return {
                ...state,
                status: isAlreadyCompleted ? 'completed' : 'viewing',
                lesson: action.lesson,
                progress: savedProgress,
                progressPercentage: savedProgress?.progress_percentage ?? 0,
                lastPosition: savedProgress?.last_position ?? 0,
                error: null,
            };
        }

        case 'LOAD_ERROR':
            return { ...state, status: 'error', error: action.error };

        case 'START_VIEWING':
            return state.status === 'viewing'
                ? { ...state, status: 'in_progress' }
                : state;

        case 'UPDATE_PROGRESS': {
            // Monotonic: only allow progress to go UP (client-side guard; server also enforces)
            const newPercentage = Math.max(state.progressPercentage, action.percentage);
            const newPosition = action.position !== undefined
                ? Math.max(state.lastPosition, action.position)
                : state.lastPosition;
            return {
                ...state,
                status: state.status === 'completed' ? 'completed' : 'in_progress',
                progressPercentage: newPercentage,
                lastPosition: newPosition,
            };
        }

        case 'COMPLETION_MET':
            return state.status === 'completed'
                ? state
                : { ...state, status: 'completing' };

        case 'COMPLETED':
            return { ...state, status: 'completed', progressPercentage: 100 };

        case 'RETRY':
            return { ...state, status: 'loading', error: null };

        case 'RESET':
            return initialState;

        default:
            return state;
    }
}

// ============================================================
// Hook
// ============================================================

export function useViewerReducer() {
    const [state, dispatch] = useReducer(viewerReducer, initialState);

    const loadLesson = useCallback(() => dispatch({ type: 'LOAD_LESSON' }), []);
    const lessonLoaded = useCallback(
        (lesson: Lesson, progress: LessonProgress | null) =>
            dispatch({ type: 'LESSON_LOADED', lesson, progress }),
        []
    );
    const loadError = useCallback(
        (error: string) => dispatch({ type: 'LOAD_ERROR', error }),
        []
    );
    const startViewing = useCallback(() => dispatch({ type: 'START_VIEWING' }), []);
    const updateProgress = useCallback(
        (percentage: number, position?: number) =>
            dispatch({ type: 'UPDATE_PROGRESS', percentage, position }),
        []
    );
    const completionMet = useCallback(() => dispatch({ type: 'COMPLETION_MET' }), []);
    const completed = useCallback(() => dispatch({ type: 'COMPLETED' }), []);
    const retry = useCallback(() => dispatch({ type: 'RETRY' }), []);
    const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

    const memoizedActions = useMemo(() => ({
        loadLesson,
        lessonLoaded,
        loadError,
        startViewing,
        updateProgress,
        completionMet,
        completed,
        retry,
        reset,
    }), [loadLesson, lessonLoaded, loadError, startViewing, updateProgress, completionMet, completed, retry, reset]);

    return {
        state,
        actions: memoizedActions,
    };
}
