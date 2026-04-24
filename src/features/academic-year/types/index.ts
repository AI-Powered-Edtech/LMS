export interface AcademicYear {
  id: string
  tenant_id: string
  name: string
  start_date: string
  end_date: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AcademicYearFormData {
  name: string
  start_date: string
  end_date: string
  is_active: boolean
}
