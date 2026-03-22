/** Entity utama Bank Soal */
export interface QuestionBank {
  id: string
  tenant_id: string
  created_at: string
  updated_at: string
}

/** Payload untuk create/update Bank Soal */
export interface QuestionBankInput {
  tenant_id: string
}

/** Response wrapper dari API Bank Soal */
export interface QuestionBankResponse {
  data: QuestionBank[]
  count: number
}

/** Filter options untuk query Bank Soal */
export interface QuestionBankFilter {
  search?: string
  page?: number
  limit?: number
}
