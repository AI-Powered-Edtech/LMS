export interface Course {
  id: string
  title: string
  description: string | null
  subject?: string
  level?: string
  tenant_id: string
  created_by: string
  created_at?: string
  updated_at?: string
  modules?: any[]
  module_count?: number
  assigned_classes?: {
    class_id: string
    class: {
      name: string
    }
  }[]
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
