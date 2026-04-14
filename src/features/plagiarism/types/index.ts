export type PlagiarismProvider = 'internal' | 'copyleaks'
export type PlagiarismStatus = 'pending' | 'processing' | 'completed' | 'error'

export interface PlagiarismMatch {
  submission_id: string
  similarity: number
}

export interface PlagiarismReportData {
  matches?: PlagiarismMatch[]
  total_compared?: number
  note?: string
}

export interface PlagiarismCheck {
  id: string
  submission_id: string
  provider: PlagiarismProvider
  status: PlagiarismStatus
  similarity_score: number | null
  report_data: PlagiarismReportData
  checked_by: string | null
  tenant_id: string
  created_at: string
  updated_at: string
}

export interface CheckPlagiarismResult {
  similarity_score: number
  status: PlagiarismStatus
  matches: PlagiarismMatch[]
}
