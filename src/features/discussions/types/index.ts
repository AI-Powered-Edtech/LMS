/** Entity utama Diskusi */
export interface Discussion {
  id: string
  tenant_id: string
  created_at: string
  updated_at: string
}

/** Payload untuk create/update Diskusi */
export interface DiscussionInput {
  tenant_id: string
}

/** Response wrapper dari API Diskusi */
export interface DiscussionResponse {
  data: Discussion[]
  count: number
}

/** Filter options untuk query Diskusi */
export interface DiscussionFilter {
  search?: string
  page?: number
  limit?: number
}
