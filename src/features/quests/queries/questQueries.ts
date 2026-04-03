/**
 * Quest React Query hooks — Phase 36A
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/contexts/AuthContext'
import { GC, STALE } from '@/utils/queryConstants'

import { questService } from '../api/questService'
import type { QuestDefinition } from '../types'
import { questKeys } from './questKeys'

// ────────────────────────────────────────────────────────────
// Student hooks
// ────────────────────────────────────────────────────────────

/**
 * Active quests with per-student progress.
 * DYNAMIC stale time — quest progress updates frequently as students learn.
 */
export function useActiveQuests(tenantId?: string) {
  const { tenantId: authTenantId } = useAuth()
  const tid = tenantId ?? authTenantId

  return useQuery({
    queryKey: questKeys.active(tid!),
    queryFn: () => questService.getActiveQuestsWithProgress(tid!),
    enabled: !!tid,
    staleTime: STALE.DYNAMIC,
    gcTime: GC.SHORT,
  })
}

// ────────────────────────────────────────────────────────────
// Teacher / Admin management hooks
// ────────────────────────────────────────────────────────────

/**
 * Quest definitions for teacher/admin management panel.
 * MODERATE stale time — quest list changes infrequently.
 */
export function useQuestDefinitions(tenantId?: string) {
  const { tenantId: authTenantId } = useAuth()
  const tid = tenantId ?? authTenantId

  return useQuery({
    queryKey: questKeys.definitions(tid!),
    queryFn: () => questService.getQuestDefinitions(tid!),
    enabled: !!tid,
    staleTime: STALE.MODERATE,
    gcTime: GC.NORMAL,
  })
}

/** Create a new quest */
export function useCreateQuest() {
  const { tenantId } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (quest: Omit<Partial<QuestDefinition>, 'id' | 'tenant_id'>) =>
      questService.createQuest(quest, tenantId!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: questKeys.definitions(tenantId!) })
      void qc.invalidateQueries({ queryKey: questKeys.active(tenantId!) })
    },
  })
}

/** Update an existing quest */
export function useUpdateQuest() {
  const { tenantId } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({
      questId,
      updates,
    }: {
      questId: string
      updates: Partial<Omit<QuestDefinition, 'id' | 'tenant_id'>>
    }) => questService.updateQuest(questId, updates, tenantId!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: questKeys.definitions(tenantId!) })
      void qc.invalidateQueries({ queryKey: questKeys.active(tenantId!) })
    },
  })
}

/** Deactivate (soft-delete) a quest */
export function useDeleteQuest() {
  const { tenantId } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (questId: string) => questService.deleteQuest(questId, tenantId!),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: questKeys.definitions(tenantId!) })
      void qc.invalidateQueries({ queryKey: questKeys.active(tenantId!) })
    },
  })
}
