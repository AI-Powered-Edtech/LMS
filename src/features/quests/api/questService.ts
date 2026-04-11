/**
 * Quest API Service — Phase 36A
 * All Supabase calls for the Learning Quests system.
 */

import { db } from '@/services/db'

import type { Quest, QuestDefinition } from '../types'

const QUEST_DEFINITION_COLUMNS =
  'id, title, description, quest_type, icon, conditions, xp_reward, sort_order, is_active, tenant_id'

export const questService = {
  /**
   * Fetch active quests with per-user progress via RPC.
   * Uses SECURITY DEFINER function — tenant and user isolation enforced server-side.
   */
  async getActiveQuestsWithProgress(tenantId: string): Promise<Quest[]> {
    const { data, error } = await db.rpc('get_active_quests_with_progress', {
      p_tenant_id: tenantId,
    })

    if (error) {
      // RPC not yet deployed — degrade gracefully
      if (error.code === 'PGRST202' || error.code === '42883') {
        if (import.meta.env.DEV)
          console.warn(
            '[questService] get_active_quests_with_progress RPC not found — migration needed.'
          )
        return []
      }
      throw error
    }

    return (data ?? []) as Quest[]
  },

  /**
   * Fetch quest definitions for teacher/admin management.
   * Ordered by sort_order then creation time.
   */
  async getQuestDefinitions(tenantId: string): Promise<QuestDefinition[]> {
    const { data, error } = await db
      .from('quests')
      .select(QUEST_DEFINITION_COLUMNS)
      .eq('tenant_id', tenantId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(100)

    if (error) {
      if (error.code === '42P01') return [] // table not yet created
      throw error
    }

    return (data ?? []) as QuestDefinition[]
  },

  /**
   * Create a new quest definition (teacher/admin).
   */
  async createQuest(
    quest: Omit<Partial<QuestDefinition>, 'id' | 'tenant_id'>,
    tenantId: string
  ): Promise<QuestDefinition> {
    const { data, error } = await db
      .from('quests')
      .insert({ ...quest, tenant_id: tenantId })
      .select(QUEST_DEFINITION_COLUMNS)
      .single()

    if (error) throw error
    return data as QuestDefinition
  },

  /**
   * Update an existing quest definition.
   */
  async updateQuest(
    questId: string,
    updates: Partial<Omit<QuestDefinition, 'id' | 'tenant_id'>>,
    tenantId: string
  ): Promise<QuestDefinition> {
    const { data, error } = await db
      .from('quests')
      .update(updates)
      .eq('id', questId)
      .eq('tenant_id', tenantId)
      .select(QUEST_DEFINITION_COLUMNS)
      .single()

    if (error) throw error
    return data as QuestDefinition
  },

  /**
   * Soft-delete (deactivate) a quest rather than hard delete.
   * Active quests in progress should not be orphaned.
   */
  async deleteQuest(questId: string, tenantId: string): Promise<void> {
    const { error } = await db
      .from('quests')
      .update({ is_active: false })
      .eq('id', questId)
      .eq('tenant_id', tenantId)

    if (error) throw error
  },
}
