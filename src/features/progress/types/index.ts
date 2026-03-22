/** Entity utama Kemajuan */
export interface Progress {
  id: string
  tenant_id: string
  created_at: string
  updated_at: string
}

/** Payload untuk create/update Kemajuan */
export interface ProgressInput {
  tenant_id: string
}

/** Response wrapper dari API Kemajuan */
export interface ProgressResponse {
  data: Progress[]
  count: number
}

/** Filter options untuk query Kemajuan */
export interface ProgressFilter {
  search?: string
  page?: number
  limit?: number
}
