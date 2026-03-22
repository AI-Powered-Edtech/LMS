/** Entity utama Kelas */
export interface Classroom {
  id: string
  tenant_id: string
  created_at: string
  updated_at: string
}

/** Payload untuk create/update Kelas */
export interface ClassroomInput {
  tenant_id: string
}

/** Response wrapper dari API Kelas */
export interface ClassroomResponse {
  data: Classroom[]
  count: number
}

/** Filter options untuk query Kelas */
export interface ClassroomFilter {
  search?: string
  page?: number
  limit?: number
}
