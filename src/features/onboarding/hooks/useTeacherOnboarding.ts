import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/services/supabase/client'

export interface TeacherOnboardingState {
  id: string | null
  current_step: number
  completed_steps: number[]
  is_completed: boolean
  dismissed: boolean
  created_class_id: string | null
  created_class_join_code: string | null
  created_course_id: string | null
}

export interface UseTeacherOnboardingReturn {
  isVisible: boolean
  currentStep: number
  totalSteps: number
  completedSteps: number[]
  createdClassId: string | null
  createdClassJoinCode: string | null
  createdCourseId: string | null
  isLoading: boolean
  nextStep: () => Promise<void>
  prevStep: () => void
  completeStep: (stepNumber: number) => Promise<void>
  completeOnboarding: () => Promise<void>
  dismissForever: () => Promise<void>
  saveClassResult: (classId: string, joinCode: string) => Promise<void>
  saveCourseResult: (courseId: string) => Promise<void>
}

const TOTAL_STEPS = 5
const LS_DISMISS_KEY = 'edusync_teacher_onboarding_dismissed'
const LS_COMPLETED_KEY = 'edusync_teacher_onboarding_completed'

/**
 * Manages teacher onboarding wizard state.
 * - Checks if onboarding is needed (first time, no classes yet, not dismissed)
 * - Persists progress to `teacher_onboarding_progress` table with localStorage fallback
 */
export function useTeacherOnboarding(): UseTeacherOnboardingReturn {
  const { user, tenantId, role } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [state, setState] = useState<TeacherOnboardingState>({
    id: null,
    current_step: 1,
    completed_steps: [],
    is_completed: false,
    dismissed: false,
    created_class_id: null,
    created_class_join_code: null,
    created_course_id: null,
  })

  // Load onboarding progress from DB
  useEffect(() => {
    if (!user || !tenantId || role !== 'teacher') {
      setIsLoading(false)
      return
    }

    // Quick local check — if already dismissed or completed, skip DB fetch
    if (
      localStorage.getItem(LS_DISMISS_KEY) === '1' ||
      localStorage.getItem(LS_COMPLETED_KEY) === '1'
    ) {
      setState((prev) => ({ ...prev, dismissed: true }))
      setIsLoading(false)
      return
    }

    let cancelled = false

    async function loadProgress() {
      try {
        const { data, error } = await supabase
          .from('teacher_onboarding_progress')
          .select(
            'id, current_step, completed_steps, is_completed, dismissed, created_class_id, created_class_join_code, created_course_id'
          )
          .eq('user_id', user!.id)
          .eq('tenant_id', tenantId!)
          .maybeSingle()

        if (cancelled) return

        if (error) {
          // Table may not exist yet in local dev — silently skip
          console.warn('[useTeacherOnboarding] DB fetch error:', error.message)
          setIsLoading(false)
          return
        }

        if (data) {
          if (data.is_completed || data.dismissed) {
            // Sync local storage to avoid future DB queries
            if (data.dismissed) localStorage.setItem(LS_DISMISS_KEY, '1')
            if (data.is_completed) localStorage.setItem(LS_COMPLETED_KEY, '1')
          }
          setState({
            id: data.id,
            current_step: data.current_step ?? 1,
            completed_steps: data.completed_steps ?? [],
            is_completed: data.is_completed ?? false,
            dismissed: data.dismissed ?? false,
            created_class_id: data.created_class_id ?? null,
            created_class_join_code: data.created_class_join_code ?? null,
            created_course_id: data.created_course_id ?? null,
          })
        }
        // If no row exists → first time user, default state already shows wizard
      } catch (err) {
        if (!cancelled) {
          console.warn('[useTeacherOnboarding] Unexpected error:', err)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadProgress()
    return () => {
      cancelled = true
    }
  }, [user, tenantId, role])

  /** Upsert progress to DB */
  const persistProgress = useCallback(
    async (updates: Partial<TeacherOnboardingState>) => {
      if (!user || !tenantId) return

      const payload = {
        user_id: user.id,
        tenant_id: tenantId,
        current_step: state.current_step,
        completed_steps: state.completed_steps,
        is_completed: state.is_completed,
        dismissed: state.dismissed,
        created_class_id: state.created_class_id,
        created_class_join_code: state.created_class_join_code,
        created_course_id: state.created_course_id,
        ...updates,
      }

      try {
        const { data, error } = await supabase
          .from('teacher_onboarding_progress')
          .upsert(payload, { onConflict: 'user_id,tenant_id' })
          .select('id')
          .maybeSingle()

        if (error) {
          console.warn('[useTeacherOnboarding] DB upsert error:', error.message)
          return
        }
        if (data?.id && !state.id) {
          setState((prev) => ({ ...prev, id: data.id }))
        }
      } catch (err) {
        console.warn('[useTeacherOnboarding] Unexpected persist error:', err)
      }
    },
    [user, tenantId, state]
  )

  const nextStep = useCallback(async () => {
    const newStep = Math.min(state.current_step + 1, TOTAL_STEPS)
    setState((prev) => ({ ...prev, current_step: newStep }))
    await persistProgress({ current_step: newStep })
  }, [state.current_step, persistProgress])

  const prevStep = useCallback(() => {
    const newStep = Math.max(state.current_step - 1, 1)
    setState((prev) => ({ ...prev, current_step: newStep }))
    // No need to await for going back
    persistProgress({ current_step: newStep })
  }, [state.current_step, persistProgress])

  const completeStep = useCallback(
    async (stepNumber: number) => {
      const newCompleted = state.completed_steps.includes(stepNumber)
        ? state.completed_steps
        : [...state.completed_steps, stepNumber]
      setState((prev) => ({ ...prev, completed_steps: newCompleted }))
      await persistProgress({ completed_steps: newCompleted })
    },
    [state.completed_steps, persistProgress]
  )

  const completeOnboarding = useCallback(async () => {
    const allSteps = Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1)
    setState((prev) => ({
      ...prev,
      is_completed: true,
      completed_steps: allSteps,
      current_step: TOTAL_STEPS,
    }))
    localStorage.setItem(LS_COMPLETED_KEY, '1')
    await persistProgress({
      is_completed: true,
      completed_steps: allSteps,
      current_step: TOTAL_STEPS,
    })
  }, [persistProgress])

  const dismissForever = useCallback(async () => {
    setState((prev) => ({ ...prev, dismissed: true }))
    localStorage.setItem(LS_DISMISS_KEY, '1')
    await persistProgress({ dismissed: true })
  }, [persistProgress])

  const saveClassResult = useCallback(
    async (classId: string, joinCode: string) => {
      setState((prev) => ({
        ...prev,
        created_class_id: classId,
        created_class_join_code: joinCode,
      }))
      await persistProgress({ created_class_id: classId, created_class_join_code: joinCode })
    },
    [persistProgress]
  )

  const saveCourseResult = useCallback(
    async (courseId: string) => {
      setState((prev) => ({ ...prev, created_course_id: courseId }))
      await persistProgress({ created_course_id: courseId })
    },
    [persistProgress]
  )

  // isVisible: only for teachers, not dismissed, not completed, not still loading
  const isVisible =
    !isLoading &&
    role === 'teacher' &&
    !state.dismissed &&
    !state.is_completed &&
    !!user &&
    !!tenantId

  return {
    isVisible,
    currentStep: state.current_step,
    totalSteps: TOTAL_STEPS,
    completedSteps: state.completed_steps,
    createdClassId: state.created_class_id,
    createdClassJoinCode: state.created_class_join_code,
    createdCourseId: state.created_course_id,
    isLoading,
    nextStep,
    prevStep,
    completeStep,
    completeOnboarding,
    dismissForever,
    saveClassResult,
    saveCourseResult,
  }
}
