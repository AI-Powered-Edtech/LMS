import { type Dispatch, useCallback } from 'react'

import { builderModuleService } from '@/src/features/courses/api/builder/moduleService'
import { useToast } from '@/src/hooks/useToast'

import type { BuilderAction, BuilderState } from './builderReducer'

export function useModuleActions(
  state: BuilderState,
  dispatch: Dispatch<BuilderAction>,
  tenantId: string | null,
  setSavingStatus: (status: BuilderState['savingStatus']) => void,
  broadcast?: (action: BuilderAction, userName: string) => void,
  userName?: string
) {
  const addToast = useToast((s) => s.addToast)

  const addModule = useCallback(
    async (title: string) => {
      if (!state.courseId || !tenantId) return
      try {
        const mod = await builderModuleService.createModule(state.courseId, title, tenantId)
        dispatch({ type: 'ADD_MODULE', module: mod })
        broadcast?.({ type: 'ADD_MODULE', module: mod }, userName ?? '')
      } catch (err: unknown) {
        if (import.meta.env.DEV) console.error('Failed to add module:', err)
        addToast({
          type: 'error',
          message:
            'Gagal menambah modul: ' +
            (err instanceof Error ? err.message : 'Kesalahan tidak diketahui'),
        })
      }
    },
    [state.courseId, tenantId, dispatch, addToast, broadcast, userName]
  )

  const updateModule = useCallback(
    async (moduleId: string, data: { title?: string; description?: string }) => {
      if (!tenantId) return
      dispatch({ type: 'UPDATE_MODULE', moduleId, data })
      setSavingStatus('saving')
      try {
        await builderModuleService.updateModule(moduleId, tenantId, data)
        setSavingStatus('saved')
        broadcast?.({ type: 'UPDATE_MODULE', moduleId, data }, userName ?? '')
      } catch {
        setSavingStatus('error')
      }
    },
    [tenantId, dispatch, setSavingStatus, broadcast, userName]
  )

  const deleteModule = useCallback(
    async (moduleId: string) => {
      if (!tenantId) return
      dispatch({ type: 'DELETE_MODULE', moduleId })
      try {
        await builderModuleService.deleteModule(moduleId, tenantId)
        broadcast?.({ type: 'DELETE_MODULE', moduleId }, userName ?? '')
      } catch (err: unknown) {
        if (import.meta.env.DEV) console.error('Failed to delete module:', err)
        addToast({
          type: 'error',
          message:
            'Gagal menghapus modul: ' +
            (err instanceof Error ? err.message : 'Kesalahan tidak diketahui'),
        })
      }
    },
    [tenantId, dispatch, addToast, broadcast, userName]
  )

  const reorderModules = useCallback(
    async (moduleIds: string[]) => {
      if (!state.courseId || !tenantId) return

      const previousModules = state.modules

      const reordered = moduleIds.map((id, idx) => {
        const mod = state.modules.find((m) => m.id === id)!
        return { ...mod, orderIndex: idx }
      })
      dispatch({ type: 'SET_MODULES', modules: reordered })

      try {
        await builderModuleService.reorderModules(state.courseId, moduleIds, tenantId)
        broadcast?.({ type: 'SET_MODULES', modules: reordered }, userName ?? '')
      } catch (error: unknown) {
        if (import.meta.env.DEV) console.error('Failed to reorder modules', error)
        dispatch({ type: 'SET_MODULES', modules: previousModules })
        addToast({
          type: 'error',
          message:
            'Gagal mengubah urutan modul: ' +
            (error instanceof Error ? error.message : 'Kesalahan tidak diketahui'),
        })
      }
    },
    [state.modules, state.courseId, tenantId, dispatch, addToast, broadcast, userName]
  )

  return { addModule, updateModule, deleteModule, reorderModules }
}
