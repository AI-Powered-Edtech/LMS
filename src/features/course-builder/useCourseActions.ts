import { type Dispatch, useCallback } from 'react'

import { useToast } from '@/hooks/useToast'
import { captureError } from '@/utils/sentry'

import { auditService } from './api/auditService'
import { builderCourseService } from './api/courseService'
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

    const hasPublishedLessons = state.modules.some(
      (mod) => mod.lessons && mod.lessons.some((l) => l.isPublished)
    )
    if (!hasPublishedLessons) {
      addToast({
        type: 'error',
        message: 'Gagal dipublish: Setidaknya satu pelajaran harus dipublikasikan terlebih dahulu.',
      })
      return
    }

    setSavingStatus('saving')
    try {
      await builderCourseService.publishCourse(state.courseId, tenantId)
      dispatch({ type: 'SET_COURSE_STATUS', status: 'published' })
      setSavingStatus('saved')
      addToast({ type: 'success', message: 'Kursus berhasil diterbitkan' })
      // Audit log (fire-and-forget)
      void auditService.logCourseAction(state.courseId, 'publish', {
        module_count: state.modules.length,
      })
    } catch (error: unknown) {
      captureError(error, { context: 'publishCourse', courseId: state.courseId })
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
      addToast({ type: 'success', message: 'Kursus berhasil dikembalikan ke draf' })
      // Audit log (fire-and-forget)
      void auditService.logCourseAction(state.courseId, 'unpublish')
    } catch (err: unknown) {
      setSavingStatus('error')
      addToast({
        type: 'error',
        message:
          'Gagal mengubah status ke draft: ' +
          (err instanceof Error ? err.message : 'Kesalahan tidak diketahui'),
      })
    }
  }, [state.courseId, tenantId, dispatch, setSavingStatus, addToast])

  const submitForReview = useCallback(async () => {
    if (!state.courseId || !tenantId) return
    setSavingStatus('saving')
    try {
      await builderCourseService.submitForReview(state.courseId, tenantId)
      dispatch({ type: 'SET_COURSE_STATUS', status: 'in_review' })
      setSavingStatus('saved')
      addToast({ type: 'success', message: 'Kursus diajukan untuk review' })
      // Audit log (fire-and-forget)
      void auditService.logCourseAction(state.courseId, 'submit_review')
    } catch (err: unknown) {
      setSavingStatus('error')
      addToast({
        type: 'error',
        message:
          'Gagal mengajukan review: ' +
          (err instanceof Error ? err.message : 'Kesalahan tidak diketahui'),
      })
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
      // Audit log (fire-and-forget)
      void auditService.logCourseAction(state.courseId, 'approve')
    } catch (err: unknown) {
      setSavingStatus('error')
      addToast({
        type: 'error',
        message:
          'Gagal menyetujui kursus: ' +
          (err instanceof Error ? err.message : 'Kesalahan tidak diketahui'),
      })
    }
  }, [state.courseId, tenantId, dispatch, setSavingStatus, addToast])

  return { loadCourse, publishCourse, draftCourse, submitForReview, approveCourse }
}
