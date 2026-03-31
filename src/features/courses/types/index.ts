export type CourseStatus = 'draft' | 'in_review' | 'approved' | 'published' | 'archived'

export interface Course {
  id: string
  title: string
  description: string | null
  status?: CourseStatus
  subject?: string | null
  level?: string | null
  tenant_id: string
  created_by: string
  created_at?: string
  updated_at?: string
  assigned_classes?: {
    class_id: string
    class: {
      name: string
    }
  }[]
  // Optional fields that may be included in API responses
  module_count?: number
  modules?: Array<{ id: string; title: string }>
}

export type CourseInsert = Omit<Course, 'id' | 'created_at' | 'updated_at'>
export type CourseUpdate = Partial<CourseInsert>

export interface FetchCoursesOptions {
  tenantId: string
  page?: number
  limit?: number
  search?: string
  ids?: string[]
}
