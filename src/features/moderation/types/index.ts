/** Entity utama Moderasi */
export interface Moderation {
  id: string
  tenant_id: string
  created_at: string
  updated_at: string
}

/** Payload untuk create/update Moderasi */
export interface ModerationInput {
  tenant_id: string
}

/** Response wrapper dari API Moderasi */
export interface ModerationResponse {
  data: Moderation[]
  count: number
}

/** Filter options untuk query Moderasi */
export interface ModerationFilter {
  search?: string
  page?: number
  limit?: number
}
