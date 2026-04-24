import { db } from '@/services/db'

export type CounselingCategory = 'akademik' | 'pribadi' | 'sosial' | 'karier' | 'pelanggaran' | 'lainnya'

export interface CounselingNote {
  id: string
  tenant_id: string
  student_id: string
  counselor_id: string | null
  session_date: string
  category: CounselingCategory
  summary: string
  follow_up: string | null
  is_confidential: boolean
  parent_notified: boolean
  created_at: string
  updated_at: string
}

const COLUMNS =
  'id, tenant_id, student_id, counselor_id, session_date, category, summary, follow_up, is_confidential, parent_notified, created_at, updated_at'

export const counselingService = {
  async list(tenantId: string, studentId?: string | null): Promise<CounselingNote[]> {
    let q = db
      .from<Array<CounselingNote>>('counseling_notes')
      .select(COLUMNS)
      .eq('tenant_id', tenantId)
    if (studentId) q = q.eq('student_id', studentId)
    const { data, error } = await q.order('session_date', { ascending: false }).limit(100)
    if (error) throw error
    return (data ?? []) as CounselingNote[]
  },

  async create(input: {
    tenantId: string
    studentId: string
    counselorId: string | null
    sessionDate: string
    category: CounselingCategory
    summary: string
    followUp?: string
    isConfidential?: boolean
  }): Promise<CounselingNote> {
    const { data, error } = await db
      .from<Array<CounselingNote>>('counseling_notes')
      .insert({
        tenant_id: input.tenantId,
        student_id: input.studentId,
        counselor_id: input.counselorId,
        session_date: input.sessionDate,
        category: input.category,
        summary: input.summary,
        follow_up: input.followUp ?? null,
        is_confidential: input.isConfidential ?? true,
      })
      .select(COLUMNS)
      .single()
    if (error) throw error
    return (data as unknown) as CounselingNote
  },
}
