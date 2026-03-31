import { type Dispatch, type MutableRefObject, useCallback } from 'react'

import { builderBlockService } from '@/src/features/courses/api/builder/blockService'
import { useToast } from '@/src/hooks/useToast'
import { DomainBlock } from '@/src/shared/types/blockTypes'

import type { BuilderAction, BuilderState } from './builderReducer'
import type { PresenceData } from './useBuilderPresence'

export function useBlockActions(
  state: BuilderState,
  dispatch: Dispatch<BuilderAction>,
  tenantId: string | null,
  setSavingStatus: (status: BuilderState['savingStatus']) => void,
  activeLessonIdRef: MutableRefObject<string | null>,
  saveTimerRef: MutableRefObject<Map<string, ReturnType<typeof setTimeout>>>,
  broadcast?: (action: BuilderAction, userName: string) => void,
  userName?: string,
  getBlockLocker?: (blockId: string) => PresenceData | null
) {
  const addToast = useToast((s) => s.addToast)

  const addBlock = useCallback(
    async (type: string) => {
      const lessonId = activeLessonIdRef.current
      if (!lessonId || !tenantId) return
      try {
        const block = await builderBlockService.createBlock(lessonId, type, tenantId)
        dispatch({ type: 'ADD_BLOCK', block })
        broadcast?.({ type: 'ADD_BLOCK', block }, userName ?? '')
      } catch (err: unknown) {
        if (import.meta.env.DEV) console.error('Failed to add block:', err)
        addToast({
          type: 'error',
          message:
            'Gagal menambah konten: ' +
            (err instanceof Error ? err.message : 'Kesalahan tidak diketahui'),
        })
      }
    },
    [tenantId, dispatch, addToast, activeLessonIdRef, broadcast, userName]
  )

  const updateBlock = useCallback(
    (blockId: string, data: Partial<DomainBlock>) => {
      if (!tenantId) return
      dispatch({ type: 'UPDATE_BLOCK', blockId, data })

      const existing = saveTimerRef.current.get(blockId)
      if (existing) clearTimeout(existing)

      const timer = setTimeout(async () => {
        setSavingStatus('saving')
        try {
          await builderBlockService.updateBlock(blockId, tenantId, data)
          setSavingStatus('saved')
          broadcast?.({ type: 'UPDATE_BLOCK', blockId, data }, userName ?? '')
        } catch {
          setSavingStatus('error')
        }
        saveTimerRef.current.delete(blockId)
      }, 2000)

      saveTimerRef.current.set(blockId, timer)
    },
    [tenantId, dispatch, setSavingStatus, saveTimerRef, broadcast, userName]
  )

  const saveBlock = useCallback(
    async (blockId: string) => {
      if (!tenantId) return

      // Conflict guard: check if block is locked by another user
      if (getBlockLocker) {
        const locker = getBlockLocker(blockId)
        if (locker) {
          console.warn(
            `Block ${blockId} sedang diedit oleh ${locker.fullName}, melewati penyimpanan`
          )
          return
        }
      }

      const existing = saveTimerRef.current.get(blockId)
      if (existing) clearTimeout(existing)
      saveTimerRef.current.delete(blockId)

      const block = state.activeLesson?.blocks.find((b) => b.id === blockId)
      if (!block) return

      const data = {
        content: block.content,
        url: block.url,
        title: block.title,
        metadata: block.metadata,
      }

      setSavingStatus('saving')
      try {
        await builderBlockService.updateBlock(blockId, tenantId, data)
        setSavingStatus('saved')
        broadcast?.({ type: 'UPDATE_BLOCK', blockId, data }, userName ?? '')
      } catch {
        setSavingStatus('error')
      }
    },
    [
      state.activeLesson,
      tenantId,
      setSavingStatus,
      saveTimerRef,
      broadcast,
      userName,
      getBlockLocker,
    ]
  )

  const deleteBlock = useCallback(
    async (blockId: string) => {
      if (!tenantId) return
      const previousBlocks = state.activeLesson?.blocks ?? []

      dispatch({ type: 'DELETE_BLOCK', blockId })
      try {
        await builderBlockService.deleteBlock(blockId, tenantId)
        broadcast?.({ type: 'DELETE_BLOCK', blockId }, userName ?? '')
      } catch (err: unknown) {
        // Rollback: restore previous blocks
        dispatch({ type: 'SET_BLOCKS', blocks: previousBlocks })
        if (import.meta.env.DEV) console.error('Failed to delete block:', err)
        addToast({
          type: 'error',
          message:
            'Gagal menghapus konten: ' +
            (err instanceof Error ? err.message : 'Kesalahan tidak diketahui'),
        })
      }
    },
    [state.activeLesson, tenantId, dispatch, addToast, broadcast, userName]
  )

  const reorderBlocks = useCallback(
    async (blockIds: string[]) => {
      if (!state.activeLesson) return

      const previousBlocks = state.activeLesson.blocks

      const reordered = blockIds
        .map((id) => state.activeLesson!.blocks.find((b) => b.id === id))
        .filter(Boolean)
        .map((b, idx) => ({ ...b!, orderIndex: idx }))
      dispatch({ type: 'SET_BLOCKS', blocks: reordered as DomainBlock[] })

      try {
        await builderBlockService.reorderBlocks(state.activeLesson!.id, blockIds, tenantId!)
        broadcast?.({ type: 'SET_BLOCKS', blocks: reordered as DomainBlock[] }, userName ?? '')
      } catch (error: unknown) {
        if (import.meta.env.DEV) console.error('Failed to reorder blocks', error)
        dispatch({ type: 'SET_BLOCKS', blocks: previousBlocks })
        addToast({
          type: 'error',
          message:
            'Gagal mengubah urutan konten: ' +
            (error instanceof Error ? error.message : 'Kesalahan tidak diketahui'),
        })
      }
    },
    [state.activeLesson, tenantId, dispatch, addToast, broadcast, userName]
  )

  const selectBlock = useCallback(
    (blockId: string | null) => {
      dispatch({ type: 'SET_ACTIVE_BLOCK', blockId })
    },
    [dispatch]
  )

  return { addBlock, updateBlock, saveBlock, deleteBlock, reorderBlocks, selectBlock }
}
