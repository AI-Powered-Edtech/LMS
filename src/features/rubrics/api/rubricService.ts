import { db } from '@/services/db'
import { logDevError } from '@/utils/logDevError'

import type { Rubric, RubricInsert, RubricScore, RubricTemplateSummary } from '../types'

const RUBRIC_SCORE_COLUMNS = 'criterion_id, level_id, score, comment'

export const rubricService = {
  /**
   * Fetch a rubric linked to a given assignment (with full criteria + levels).
   * Returns null if no rubric has been attached to this assignment.
   */
  async getRubricByAssignment(assignmentId: string, tenantId: string): Promise<Rubric | null> {
    const { data: rubricRow, error: findError } = await db
      .from('rubrics')
      .select('id')
      .eq('assignment_id', assignmentId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (findError) {
      logDevError('rubricService', 'Error finding rubric by assignment:', findError)
      throw findError
    }

    if (!rubricRow) return null

    const { data, error } = await db.rpc('get_rubric_with_criteria', {
      p_rubric_id: rubricRow.id,
    })

    if (error) {
      logDevError('rubricService', 'Error fetching rubric with criteria:', error)
      throw error
    }

    return data as Rubric | null
  },

  /**
   * Fetch all rubric templates for a tenant (lightweight list for template picker).
   * Explicit columns only — no SELECT *.
   */
  async getRubricTemplates(tenantId: string): Promise<RubricTemplateSummary[]> {
    const { data, error } = await db
      .from('rubrics')
      .select('id, title, description, total_points, created_at')
      .eq('is_template', true)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      logDevError('rubricService', 'Error fetching rubric templates:', error)
      throw error
    }

    return (data ?? []) as RubricTemplateSummary[]
  },

  /**
   * Save (create or update) a rubric with all criteria and levels transactionally.
   * Returns the rubric UUID.
   */
  async saveRubric(rubric: RubricInsert & { id?: string }): Promise<string> {
    const { data, error } = await db.rpc('save_rubric', {
      p_rubric: rubric as unknown as Record<string, unknown>,
    })

    if (error) {
      logDevError('rubricService', 'Error saving rubric:', error)
      throw error
    }

    return data as string
  },

  /**
   * Bulk-upsert rubric scores for a submission (one row per criterion).
   */
  async scoreSubmission(submissionId: string, scores: RubricScore[]): Promise<void> {
    const { error } = await db.rpc('score_submission_rubric', {
      p_submission_id: submissionId,
      p_scores: scores as unknown as Record<string, unknown>[],
    })

    if (error) {
      logDevError('rubricService', 'Error scoring submission rubric:', error)
      throw error
    }
  },

  /**
   * Fetch all rubric scores for a submission.
   * Tenant isolation is enforced via RLS + explicit tenant_id filter.
   */
  async getRubricScores(submissionId: string, tenantId: string): Promise<RubricScore[]> {
    const { data, error } = await db
      .from('rubric_scores')
      .select(RUBRIC_SCORE_COLUMNS)
      .eq('submission_id', submissionId)
      .eq('tenant_id', tenantId)

    if (error) {
      logDevError('rubricService', 'Error fetching rubric scores:', error)
      throw error
    }

    return (data ?? []) as RubricScore[]
  },

  /**
   * Delete a rubric by ID (cascades to criteria, levels, and scores via DB).
   */
  async deleteRubric(rubricId: string, tenantId: string): Promise<void> {
    const { error } = await db.from('rubrics').delete().eq('id', rubricId).eq('tenant_id', tenantId)

    if (error) {
      logDevError('rubricService', 'Error deleting rubric:', error)
      throw error
    }
  },

  /**
   * Fetch a full rubric by ID (with criteria + levels) via RPC.
   * Used by template import to get full rubric data.
   */
  async getRubricById(rubricId: string): Promise<Rubric | null> {
    const { data, error } = await db.rpc('get_rubric_with_criteria', {
      p_rubric_id: rubricId,
    })

    if (error) {
      logDevError('rubricService', 'Error fetching rubric by ID:', error)
      throw error
    }

    return data as Rubric | null
  },
}
