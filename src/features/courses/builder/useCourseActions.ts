import { type Dispatch, useCallback } from 'react'

import { builderCourseService } from '@/src/features/courses/api/builder/courseService'
import { useToast } from '@/src/hooks/useToast'

import type { BuilderAction, BuilderState } from './builderReducer'

export function useCourseActions(
  state: BuilderState,
  dispatch: Dispatch<BuilderAction>,
  tenantId: string | null,
  setSavingStatus: (status: BuilderState['savingStatus']) => void
) {
  const addToast = useToast((s) => s.addToast)

  const loadCourse = useCallback(
    async (courseId: string) => {
      if (!tenantId) return
      dispatch({ type: 'LOAD_COURSE_START' })
      try {
        const { course, modules } = await builderCourseService.fetchCourseStructure(
          courseId,
          tenantId
        )
        dispatch({ type: 'LOAD_COURSE_SUCCESS', course, modules })
      } catch (err: unknown) {
        dispatch({ type: 'LOAD_COURSE_ERROR', error: (err as Error).message })
      }
    },
    [tenantId, dispatch]
  )

  const publishCourse = useCallback(async () => {
    if (!state.courseId || !tenantId) return

    if (state.modules.length === 0) {
      addToast({
        type: 'error',
        message: 'Gagal dipublish: Kursus harus memiliki setidaknya satu modul.',
      })
      return
    }

    const hasLessons = state.modules.some((mod) => mod.lessons && mod.lessons.length > 0)
    if (!hasLessons) {
      addToast({
        type: 'error',
        message: 'Gagal dipublish: Modul harus memiliki setidaknya satu pelajaran.',
      })
      return
    }

    setSavingStatus('saving')
    try {
      await builderCourseService.publishCourse(state.courseId, tenantId)
      dispatch({ type: 'SET_COURSE_STATUS', status: 'published' })
      setSavingStatus('saved')
      addToast({ type: 'success', message: 'Kursus berhasil diterbitkan' })
    } catch (error: unknown) {
      if (import.meta.env.DEV) console.error('Failed to publish course:', error)
      setSavingStatus('error')
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Gagal menerbitkan kursus',
      })
    }
  }, [state.courseId, state.modules, tenantId, dispatch, setSavingStatus, addToast])

  const draftCourse = useCallback(async () => {
    if (!state.courseId || !tenantId) return
    setSavingStatus('saving')
    try {
      await builderCourseService.draftCourse(state.courseId, tenantId)
      dispatch({ type: 'SET_COURSE_STATUS', status: 'draft' })
      setSavingStatus('saved')
    } catch {
      setSavingStatus('error')
    }
  }, [state.courseId, tenantId, dispatch, setSavingStatus])

  const submitForReview = useCallback(async () => {
    if (!state.courseId || !tenantId) return
    setSavingStatus('saving')
    try {
      await builderCourseService.submitForReview(state.courseId, tenantId)
      dispatch({ type: 'SET_COURSE_STATUS', status: 'in_review' })
      setSavingStatus('saved')
      addToast({ type: 'success', message: 'Kursus diajukan untuk review' })
    } catch {
      setSavingStatus('error')
    }
  }, [state.courseId, tenantId, dispatch, setSavingStatus, addToast])

  const approveCourse = useCallback(async () => {
    if (!state.courseId || !tenantId) return
    setSavingStatus('saving')
    try {
      await builderCourseService.approveCourse(state.courseId, tenantId)
      dispatch({ type: 'SET_COURSE_STATUS', status: 'approved' })
      setSavingStatus('saved')
      addToast({ type: 'success', message: 'Kursus disetujui' })
    } catch {
      setSavingStatus('error')
    }
  }, [state.courseId, tenantId, dispatch, setSavingStatus, addToast])

  return { loadCourse, publishCourse, draftCourse, submitForReview, approveCourse }
}
