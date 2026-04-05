import { type Dispatch, useCallback } from 'react'

import { builderModuleService } from '@/features/courses/api/builder/moduleService'
import { useToast } from '@/hooks/useToast'
import { DomainModule } from '@/shared/types/moduleTypes'

import type { BuilderAction, BuilderState } from './builderReducer'

export function useModuleActions(
  state: BuilderState,
  dispatch: Dispatch<BuilderAction>,
  tenantId: string | null,
  setSavingStatus: (status: BuilderState['savingStatus']) => void
) {
  const addToast = useToast((s) => s.addToast)

  const addModule = useCallback(
    async (title: string) => {
      if (!state.courseId || !tenantId) return
      try {
        const mod = await builderModuleService.createModule(state.courseId, title, tenantId)
        dispatch({ type: 'ADD_MODULE', module: mod })
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
    [state.courseId, tenantId, dispatch, addToast]
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
    [state.modules, tenantId, dispatch, setSavingStatus, addToast]
  )

  const deleteModule = useCallback(
    async (moduleId: string) => {
      if (!tenantId) return
      dispatch({ type: 'DELETE_MODULE', moduleId })
      try {
        await builderModuleService.deleteModule(moduleId, tenantId)
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
    [tenantId, dispatch, addToast]
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
    [state.modules, state.courseId, tenantId, dispatch, addToast]
  )

  return { addModule, updateModule, deleteModule, reorderModules }
}
