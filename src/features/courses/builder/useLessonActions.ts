import { type Dispatch, useCallback } from 'react'

import { builderBlockService } from '@/src/features/courses/api/builder/blockService'
import { builderLessonService } from '@/src/features/courses/api/builder/lessonService'
import { useToast } from '@/src/hooks/useToast'
import { DomainLesson } from '@/src/shared/types/lessonTypes'
import { captureError } from '@/src/utils/sentry'

import type { BuilderAction, BuilderState } from './builderReducer'

export function useLessonActions(
  state: BuilderState,
  dispatch: Dispatch<BuilderAction>,
  tenantId: string | null,
  setSavingStatus: (status: BuilderState['savingStatus']) => void,
  broadcast?: (action: BuilderAction, userName: string) => void,
  userName?: string
) {
  const addToast = useToast((s) => s.addToast)

  const addLesson = useCallback(
    async (moduleId: string, type: string, title: string) => {
      if (!tenantId) return
      try {
        const lesson = await builderLessonService.createLesson(moduleId, type, title, tenantId)
        dispatch({ type: 'ADD_LESSON', moduleId, lesson })
        broadcast?.({ type: 'ADD_LESSON', moduleId, lesson }, userName ?? '')
      } catch (err: unknown) {
        if (import.meta.env.DEV) console.error('Failed to add lesson:', err)
        addToast({
          type: 'error',
          message:
            'Gagal menambah materi: ' +
            (err instanceof Error ? err.message : 'Kesalahan tidak diketahui'),
        })
      }
    },
    [tenantId, dispatch, addToast, broadcast, userName]
  )

  const updateLesson = useCallback(
    async (lessonId: string, data: Partial<DomainLesson>) => {
      if (!tenantId) return
      dispatch({ type: 'UPDATE_LESSON', lessonId, data })
      setSavingStatus('saving')
      try {
        await builderLessonService.updateLesson(lessonId, tenantId, data)
        setSavingStatus('saved')
        broadcast?.({ type: 'UPDATE_LESSON', lessonId, data }, userName ?? '')
      } catch {
        setSavingStatus('error')
      }
    },
    [tenantId, dispatch, setSavingStatus, broadcast, userName]
  )

  const deleteLesson = useCallback(
    async (lessonId: string) => {
      if (!tenantId) return
      dispatch({ type: 'DELETE_LESSON', lessonId })
      try {
        await builderLessonService.deleteLesson(lessonId, tenantId)
        broadcast?.({ type: 'DELETE_LESSON', lessonId }, userName ?? '')
      } catch (err: unknown) {
        if (import.meta.env.DEV) console.error('Failed to delete lesson:', err)
        addToast({
          type: 'error',
          message:
            'Gagal menghapus materi: ' +
            (err instanceof Error ? err.message : 'Kesalahan tidak diketahui'),
        })
      }
    },
    [tenantId, dispatch, addToast, broadcast, userName]
  )

  const reorderLessons = useCallback(
    async (lessonIds: string[]) => {
      const previousModules = state.modules

      const updatedModules = state.modules.map((m) => {
        const isTargetModule = m.lessons.some((l) => lessonIds.includes(l.id))
        if (!isTargetModule) return m

        const newLessons = lessonIds
          .map((id) => m.lessons.find((l) => l.id === id))
          .filter(Boolean)
          .map((l, idx) => ({ ...l!, orderIndex: idx }))

        return { ...m, lessons: newLessons as DomainLesson[] }
      })

      dispatch({ type: 'SET_MODULES', modules: updatedModules })

      const targetMod = state.modules.find((m) => m.lessons.some((l) => lessonIds.includes(l.id)))
      if (targetMod && tenantId) {
        try {
          await builderLessonService.reorderLessons(targetMod.id, lessonIds, tenantId)
          broadcast?.({ type: 'SET_MODULES', modules: updatedModules }, userName ?? '')
        } catch (error: unknown) {
          if (import.meta.env.DEV) console.error('Failed to reorder lessons', error)
          dispatch({ type: 'SET_MODULES', modules: previousModules })
          addToast({
            type: 'error',
            message:
              'Gagal mengubah urutan materi: ' +
              (error instanceof Error ? error.message : 'Kesalahan tidak diketahui'),
          })
        }
      }
    },
    [state.modules, tenantId, dispatch, addToast, broadcast, userName]
  )

  const selectLesson = useCallback(
    async (lessonId: string) => {
      if (!tenantId) return
      dispatch({ type: 'LOAD_BLOCKS_START' })
      try {
        const blocks = await builderBlockService.fetchLessonBlocks(lessonId, tenantId)
        dispatch({ type: 'LOAD_BLOCKS_SUCCESS', lessonId, blocks })
      } catch (err) {
        if (import.meta.env.DEV) console.error('Failed to load blocks:', err)
        captureError(err, { context: 'useLessonActions.selectLesson', lessonId })
      }
    },
    [tenantId, dispatch]
  )

  const closeLesson = useCallback(() => {
    dispatch({ type: 'CLOSE_LESSON' })
  }, [dispatch])

  return { addLesson, updateLesson, deleteLesson, reorderLessons, selectLesson, closeLesson }
}
