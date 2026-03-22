/** Entity utama Administrasi */
export interface Administration {
  id: string
  tenant_id: string
  created_at: string
  updated_at: string
}

/** Payload untuk create/update Administrasi */
export interface AdministrationInput {
  tenant_id: string
}

/** Response wrapper dari API Administrasi */
export interface AdministrationResponse {
  data: Administration[]
  count: number
}

/** Filter options untuk query Administrasi */
export interface AdministrationFilter {
  search?: string
  page?: number
  limit?: number
}
