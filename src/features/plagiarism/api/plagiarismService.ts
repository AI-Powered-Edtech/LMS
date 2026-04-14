import { readVilSession } from '@/services/auth/vilSession'
import { db } from '@/services/db'
import { logDevError } from '@/utils/logDevError'

import type { CheckPlagiarismResult, PlagiarismCheck } from '../types'

const PLAGIARISM_COLUMNS =
  'id, submission_id, provider, status, similarity_score, report_data, checked_by, tenant_id, created_at, updated_at'

export const plagiarismService = {
  /**
   * Calls the VIL plagiarism check endpoint to run similarity analysis.
   * Returns the similarity score and matched submissions.
   *
   * TODO: Phase 6 — check-plagiarism belum punya VIL endpoint resmi.
   * Saat VIL mengimplementasi endpoint ini, ganti dengan /api/v1/plagiarism/check.
   */
  async checkPlagiarism(submissionId: string): Promise<CheckPlagiarismResult> {
    const token = readVilSession()?.access_token
    if (!token) {
      throw new Error('Tidak terautentikasi')
    }

    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

    // TODO: Phase 6 — ganti dengan /api/v1/plagiarism/check saat endpoint tersedia di VIL.
    const res = await fetch(`${apiUrl}/api/v1/plagiarism/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ submission_id: submissionId }),
    })

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ error: 'Gagal menghubungi server' }))
      throw new Error(errBody.error ?? 'Gagal memeriksa plagiarisme')
    }

    return res.json() as Promise<CheckPlagiarismResult>
  },

  /**
   * Fetches all plagiarism checks for a tenant, ordered by most recent first.
   * Returns an empty array if none found or on error.
   */
  async getAllChecks(tenantId: string, limit = 50): Promise<PlagiarismCheck[]> {
    const { data, error } = await db
      .from('plagiarism_checks')
      .select(PLAGIARISM_COLUMNS)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      logDevError('plagiarismService', 'Error fetching all checks:', error)
      return []
    }

    return (data ?? []) as PlagiarismCheck[]
  },

  /**
   * Fetches the latest plagiarism check result for a given submission.
   * Returns null if no check has been run yet.
   */
  async getCheckResult(submissionId: string, tenantId: string): Promise<PlagiarismCheck | null> {
    const { data, error } = await db
      .from('plagiarism_checks')
      .select(PLAGIARISM_COLUMNS)
      .eq('submission_id', submissionId)
      .eq('tenant_id', tenantId)
      .limit(1)
      .maybeSingle()

    if (error) {
      logDevError('plagiarismService', 'Error fetching check result:', error)
      return null
    }

    return data as PlagiarismCheck | null
  },
}
