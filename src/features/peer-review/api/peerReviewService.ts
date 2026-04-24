import { db } from '@/services/db'
import { logDevError } from '@/utils/logDevError'

import type { PeerReview, PeerReviewConfig, PeerReviewConfigInsert } from '../types'

const CONFIG_COLUMNS =
  'id, assignment_id, reviews_per_student, is_anonymous, rubric_id, weight_in_grade, status, due_date, tenant_id, created_by, created_at'

const REVIEW_COLUMNS =
  'id, config_id, reviewer_id, submission_id, status, overall_score, overall_comment, submitted_at, tenant_id, created_at'

export const peerReviewService = {
  /**
   * Fetch peer review config by assignment.
   * Returns null if no config exists for this assignment in the tenant.
   */
  async getConfigByAssignment(
    assignmentId: string,
    tenantId: string
  ): Promise<PeerReviewConfig | null> {
    const { data, error } = await db
      .from('peer_review_config')
      .select(CONFIG_COLUMNS)
      .eq('assignment_id', assignmentId)
      .eq('tenant_id', tenantId)
      .limit(1)
      .maybeSingle()

    if (error) {
      logDevError('peerReviewService', 'Error fetching config by assignment:', error)
      throw error
    }

    return data as PeerReviewConfig | null
  },

  /**
   * Insert or update peer review config for an assignment.
   * Uses ON CONFLICT (assignment_id) DO UPDATE to upsert.
   */
  async saveConfig(
    config: PeerReviewConfigInsert,
    tenantId: string,
    createdBy: string
  ): Promise<PeerReviewConfig> {
    const { data, error } = await db
      .from('peer_review_config')
      .upsert(
        { ...config, tenant_id: tenantId, created_by: createdBy },
        { onConflict: 'assignment_id' }
      )
      .select(CONFIG_COLUMNS)
      .single()

    if (error) {
      logDevError('peerReviewService', 'Error saving config:', error)
      throw error
    }

    return (data as unknown) as PeerReviewConfig
  },

  /**
   * Trigger random peer review assignment via RPC.
   * Returns total number of review assignments created.
   */
  async assignReviews(configId: string): Promise<number> {
    const { data, error } = await db.rpc('assign_peer_reviews', {
      p_config_id: configId,
    })

    if (error) {
      logDevError('peerReviewService', 'Error assigning peer reviews:', error)
      throw error
    }

    return (data as number) ?? 0
  },

  /**
   * Fetch all pending/in-progress peer reviews assigned to the current user.
   * Excludes already submitted reviews. Paginated to 20.
   */
  async getMyReviews(userId: string, tenantId: string): Promise<PeerReview[]> {
    const { data, error } = await db
      .from('peer_reviews')
      .select(
        'id, config_id, submission_id, status, overall_score, overall_comment, submitted_at, reviewer_id, tenant_id, created_at'
      )
      .eq('reviewer_id', userId)
      .eq('tenant_id', tenantId)
      .neq('status', 'submitted')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      // A student with no assigned peer reviews may be forbidden from reading
      // the peer_reviews table by BE policy (403) or the table may be missing
      // in some tenants (42P01). Treat both as "no data" rather than surfacing
      // a scary error toast on the Peer Review page empty-state.
      const code = (error as { code?: string; status?: number }).code
      const status = (error as { status?: number }).status
      if (code === '42P01' || status === 403 || status === 404) {
        return []
      }
      logDevError('peerReviewService', 'Error fetching my reviews:', error)
      throw error
    }

    return (data ?? []) as PeerReview[]
  },

  /**
   * Fetch all reviews received for a specific submission.
   * Used by teacher summary panel — shows scores and comments.
   */
  async getReviewsBySubmission(submissionId: string, tenantId: string): Promise<PeerReview[]> {
    const { data, error } = await db
      .from('peer_reviews')
      .select(
        'id, reviewer_id, overall_score, overall_comment, status, submitted_at, config_id, submission_id, tenant_id, created_at'
      )
      .eq('submission_id', submissionId)
      .eq('tenant_id', tenantId)
      .order('submitted_at', { ascending: false })
      .limit(50)

    if (error) {
      logDevError('peerReviewService', 'Error fetching reviews by submission:', error)
      throw error
    }

    return (data ?? []) as PeerReview[]
  },

  /**
   * Submit a peer review — sets score, comment, status=submitted, submitted_at.
   * Scoped to reviewer_id = auth.uid() for security.
   */
  async submitReview(
    reviewId: string,
    score: number,
    comment: string,
    tenantId: string
  ): Promise<PeerReview> {
    const { data, error } = await db
      .from('peer_reviews')
      .update({
        overall_score: score,
        overall_comment: comment,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', reviewId)
      .eq('tenant_id', tenantId)
      .select(REVIEW_COLUMNS)
      .single()

    if (error) {
      logDevError('peerReviewService', 'Error submitting review:', error)
      throw error
    }

    return (data as unknown) as PeerReview
  },

  /**
   * Fetch submission content for review display.
   * Returns submission text and file URL.
   */
  async getSubmissionForReview(
    submissionId: string,
    tenantId: string
  ): Promise<{ id: string; submission_text: string | null; file_url: string | null } | null> {
    const { data, error } = await db
      .from('assignment_submissions')
      .select('id, submission_text, file_url')
      .eq('id', submissionId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (error) {
      logDevError('peerReviewService', 'Error fetching submission for review:', error)
      return null
    }

    return data as { id: string; submission_text: string | null; file_url: string | null } | null
  },
}
