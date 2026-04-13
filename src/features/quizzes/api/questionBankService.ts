// =============================================================================
// questionBankService.ts — Question Bank & Pool Config CRUD
//
// Phase 33A: Server-Side Question Bank Pool Randomization
// All queries are tenant-scoped with explicit columns (no SELECT *).
// =============================================================================

import { db } from '@/services/db'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QuestionBankSummary {
  id: string
  title: string
  description: string | null
  question_count: number
}

export interface PoolConfig {
  id: string
  quiz_id: string
  bank_id: string
  draw_count: number
  points_per_question: number
}

export interface PoolConfigInput {
  quizId: string
  bankId: string
  drawCount: number
  pointsPerQuestion: number
}

export interface BankQuestion {
  id: string
  question_text: string
  question_type: string
}

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * Fetch all question banks available for this tenant.
 * Ordered by title, max 100.
 */
export async function getQuestionBanks(tenantId: string): Promise<QuestionBankSummary[]> {
  const { data, error } = await db
    .from('question_banks')
    .select('id, title, description, question_count')
    .eq('tenant_id', tenantId)
    .order('title', { ascending: true })
    .limit(100)

  if (error) throw error
  return (data ?? []) as QuestionBankSummary[]
}

/**
 * Fetch all pool configs attached to a quiz.
 */
export async function getPoolConfigs(quizId: string, tenantId: string): Promise<PoolConfig[]> {
  const { data, error } = await db
    .from('quiz_pool_config')
    .select('id, quiz_id, bank_id, draw_count, points_per_question')
    .eq('quiz_id', quizId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as PoolConfig[]
}

/**
 * Upsert a pool config for a quiz–bank pair.
 * Uses ON CONFLICT (quiz_id, bank_id) DO UPDATE.
 */
export async function savePoolConfig(
  config: PoolConfigInput,
  tenantId: string
): Promise<PoolConfig> {
  const { data, error } = await db
    .from('quiz_pool_config')
    .upsert(
      {
        quiz_id: config.quizId,
        bank_id: config.bankId,
        draw_count: config.drawCount,
        points_per_question: config.pointsPerQuestion,
        tenant_id: tenantId,
      },
      { onConflict: 'quiz_id,bank_id' }
    )
    .select('id, quiz_id, bank_id, draw_count, points_per_question')
    .single()

  if (error) throw error
  return data as PoolConfig
}

/**
 * Delete a pool config by id.
 */
export async function deletePoolConfig(id: string, tenantId: string): Promise<void> {
  const { error } = await db
    .from('quiz_pool_config')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) throw error
}

/**
 * Fetch a preview of questions inside a bank (for teacher validation).
 * Max 50 rows, explicit columns, tenant-scoped.
 */
export async function getQuestionsInBank(
  bankId: string,
  tenantId: string,
  limit = 50
): Promise<BankQuestion[]> {
  const { data, error } = await db
    .from('question_bank_members')
    .select(
      `
      question_bank!inner (
        id,
        question_text,
        question_type
      )
    `
    )
    .eq('bank_id', bankId)
    .eq('tenant_id', tenantId)
    .limit(limit)

  if (error) throw error

  return (data ?? []).map((row: any) => {
    const q = Array.isArray(row.question_bank) ? row.question_bank[0] : row.question_bank
    return {
      id: q?.id ?? '',
      question_text: q?.question_text ?? '',
      question_type: q?.question_type ?? '',
    }
  })
}

/**
 * Check whether a quiz has any pool configs (for UI indicator).
 * Returns true if at least one pool config exists.
 */
export async function hasPoolConfigs(quizId: string, tenantId: string): Promise<boolean> {
  const { count, error } = await db
    .from('quiz_pool_config')
    .select('id', { count: 'exact', head: true })
    .eq('quiz_id', quizId)
    .eq('tenant_id', tenantId)

  if (error) throw error
  return (count ?? 0) > 0
}
