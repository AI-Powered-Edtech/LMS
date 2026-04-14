import { apiFetch } from '@/src/lib/api'

// ============================================================
// Types (exported for use in AssignmentBlockEditor)
// ============================================================

export interface AssignmentBlockData {
  id?: string
  title: string
  instructions: string | null
  max_points: number
  max_attempts: number
  is_published: boolean
  due_date?: string | null
}

// ============================================================
// Service (tenant-aware)
// ============================================================

export const builderAssignmentService = {
  async getAssignmentByLesson(lessonId: string, tenantId: string) {
    const { data, error } = await apiFetch('/assignments')

    if (error) throw new Error(error.message)
    return data || null
  },

  async saveAssignmentData(
    lessonId: string,
    courseId: string,
    tenantId: string,
    data: AssignmentBlockData
  ) {
    if (data.id) {
      const { data: result, error } = await apiFetch('/assignments')
      if (error) throw new Error(error.message)
      return result
    } else {
      const { data: result, error } = await apiFetch('/assignments')
      if (error) throw new Error(error.message)
      return result
    }
  },
}
