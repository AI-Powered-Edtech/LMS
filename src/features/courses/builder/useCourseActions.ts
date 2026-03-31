import { type Dispatch, useCallback } from 'react'

import { builderCourseService } from '@/features/courses/api/builder/courseService'
import { useToast } from '@/hooks/useToast'

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
        const message = err instanceof Error ? err.message : 'Gagal memuat data kursus'
        dispatch({ type: 'LOAD_COURSE_ERROR', error: message })
        addToast({ type: 'error', message })
      }
    },
    [tenantId, dispatch, addToast]
  )

  const publishCourse = useCallback(async () => {
    if (!state.courseId || !tenantId) return
    if (state.savingStatus === 'saving') return

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

    if (state.activeLesson && state.activeLesson.blocks.length === 0) {
      addToast({
        type: 'warning',
        message:
          'Peringatan: Materi yang sedang dibuka tidak memiliki konten. Pastikan semua materi sudah diisi sebelum publikasi.',
      })
      // Don't block — just warn
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
  }, [
    state.courseId,
    state.modules,
    state.savingStatus,
    state.activeLesson,
    tenantId,
    dispatch,
    setSavingStatus,
    addToast,
  ])

  const draftCourse = useCallback(async () => {
    if (!state.courseId || !tenantId) return
    if (state.savingStatus === 'saving') return
    setSavingStatus('saving')
    try {
      await builderCourseService.draftCourse(state.courseId, tenantId)
      dispatch({ type: 'SET_COURSE_STATUS', status: 'draft' })
      setSavingStatus('saved')
      addToast({ type: 'success', message: 'Kursus kembali ke mode draft.' })
    } catch (err: unknown) {
      setSavingStatus('error')
      addToast({
        type: 'error',
        message:
          'Gagal mengubah status ke draft: ' +
          (err instanceof Error ? err.message : 'Kesalahan tidak diketahui'),
      })
    }
  }, [state.courseId, state.savingStatus, tenantId, dispatch, setSavingStatus, addToast])

  const submitForReview = useCallback(async () => {
    if (!state.courseId || !tenantId) return
    if (state.savingStatus === 'saving') return
    setSavingStatus('saving')
    try {
      await builderCourseService.submitForReview(state.courseId, tenantId)
      dispatch({ type: 'SET_COURSE_STATUS', status: 'in_review' })
      setSavingStatus('saved')
      addToast({ type: 'success', message: 'Kursus diajukan untuk review' })
    } catch (err: unknown) {
      setSavingStatus('error')
      addToast({
        type: 'error',
        message:
          'Gagal mengajukan review: ' +
          (err instanceof Error ? err.message : 'Kesalahan tidak diketahui'),
      })
    }
  }, [state.courseId, state.savingStatus, tenantId, dispatch, setSavingStatus, addToast])

  const approveCourse = useCallback(async () => {
    if (!state.courseId || !tenantId) return
    if (state.savingStatus === 'saving') return
    setSavingStatus('saving')
    try {
      await builderCourseService.approveCourse(state.courseId, tenantId)
      dispatch({ type: 'SET_COURSE_STATUS', status: 'approved' })
      setSavingStatus('saved')
      addToast({ type: 'success', message: 'Kursus disetujui' })
    } catch (err: unknown) {
      setSavingStatus('error')
      addToast({
        type: 'error',
        message:
          'Gagal menyetujui kursus: ' +
          (err instanceof Error ? err.message : 'Kesalahan tidak diketahui'),
      })
    }
  }, [state.courseId, state.savingStatus, tenantId, dispatch, setSavingStatus, addToast])

  return { loadCourse, publishCourse, draftCourse, submitForReview, approveCourse }
}
