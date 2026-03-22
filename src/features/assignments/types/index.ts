/** Entity utama Tugas */
export interface Assignment {
  id: string
  tenant_id: string
  created_at: string
  updated_at: string
}

/** Payload untuk create/update Tugas */
export interface AssignmentInput {
  tenant_id: string
}

/** Response wrapper dari API Tugas */
export interface AssignmentResponse {
  data: Assignment[]
  count: number
}

/** Filter options untuk query Tugas */
export interface AssignmentFilter {
  search?: string
  page?: number
  limit?: number
}
