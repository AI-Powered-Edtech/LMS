import { type Dispatch, useCallback } from 'react'

import { builderModuleService } from '@/src/features/courses/api/builder/moduleService'
import { useToast } from '@/src/hooks/useToast'
import { DomainModule } from '@/src/shared/types/moduleTypes'

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
      setSavingStatus('saving')
      try {
        const mod = await builderModuleService.createModule(state.courseId, title, tenantId)
        dispatch({ type: 'ADD_MODULE', module: mod })
        broadcast?.({ type: 'ADD_MODULE', module: mod }, userName ?? '')
        setSavingStatus('saved')
      } catch (err: unknown) {
        if (import.meta.env.DEV) console.error('Failed to add module:', err)
        setSavingStatus('error')
        addToast({
          type: 'error',
          message:
            'Gagal menambah modul: ' +
            (err instanceof Error ? err.message : 'Kesalahan tidak diketahui'),
        })
      }
    },
    [state.courseId, tenantId, dispatch, addToast, setSavingStatus, broadcast, userName]
  )

  const updateModule = useCallback(
    async (moduleId: string, data: { title?: string; description?: string }) => {
      if (!tenantId) return
      const prevModule = state.modules.find((m) => m.id === moduleId)

      dispatch({ type: 'UPDATE_MODULE', moduleId, data })
      setSavingStatus('saving')
      try {
        await builderModuleService.updateModule(moduleId, tenantId, data)
        setSavingStatus('saved')
        broadcast?.({ type: 'UPDATE_MODULE', moduleId, data }, userName ?? '')
      } catch (err: unknown) {
        if (prevModule) {
          dispatch({ type: 'UPDATE_MODULE', moduleId, data: { title: prevModule.title } })
        }
        setSavingStatus('error')
        addToast({
          type: 'error',
          message:
            'Gagal menyimpan modul: ' +
            (err instanceof Error ? err.message : 'Kesalahan tidak diketahui'),
        })
      }
    },
    [state.modules, tenantId, dispatch, setSavingStatus, broadcast, userName, addToast]
  )

  const deleteModule = useCallback(
    async (moduleId: string) => {
      if (!tenantId) return
      // Save previous state for rollback
      const previousModules = state.modules
      dispatch({ type: 'DELETE_MODULE', moduleId })
      try {
        await builderModuleService.deleteModule(moduleId, tenantId)
        broadcast?.({ type: 'DELETE_MODULE', moduleId }, userName ?? '')
      } catch (err: unknown) {
        // Rollback: restore modules to pre-delete state
        dispatch({ type: 'SET_MODULES', modules: previousModules })
        if (import.meta.env.DEV) console.error('Failed to delete module:', err)
        addToast({
          type: 'error',
          message:
            'Gagal menghapus modul: ' +
            (err instanceof Error ? err.message : 'Kesalahan tidak diketahui'),
        })
      }
    },
    [state.modules, tenantId, dispatch, addToast, broadcast, userName]
  )

  const reorderModules = useCallback(
    async (moduleIds: string[]) => {
      if (!state.courseId || !tenantId) return

      const previousModules = state.modules

      const reordered = moduleIds
        .map((id, idx) => {
          const mod = state.modules.find((m) => m.id === id)
          if (!mod) return null
          return { ...mod, orderIndex: idx }
        })
        .filter(Boolean) as DomainModule[]
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
