import { supabase } from '@/services/supabase/client'
import { logDevError } from '@/utils/logDevError'

import type { CheckPlagiarismResult, PlagiarismCheck } from '../types'

const PLAGIARISM_COLUMNS =
  'id, submission_id, provider, status, similarity_score, report_data, checked_by, tenant_id, created_at, updated_at'

export const plagiarismService = {
  /**
   * Calls the check-plagiarism Edge Function to run similarity analysis.
   * Returns the similarity score and matched submissions.
   */
  async checkPlagiarism(submissionId: string): Promise<CheckPlagiarismResult> {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.access_token) {
      throw new Error('Tidak terautentikasi')
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const res = await fetch(`${supabaseUrl}/functions/v1/check-plagiarism`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
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
   * Fetches the latest plagiarism check result for a given submission.
   * Returns null if no check has been run yet.
   */
  async getCheckResult(submissionId: string, tenantId: string): Promise<PlagiarismCheck | null> {
    const { data, error } = await supabase
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
