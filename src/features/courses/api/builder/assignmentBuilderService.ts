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
  async getAssignmentByLesson(lessonId: string, _tenantId: string) {
    const { data, error } = await apiFetch(`/v1/lessons/${lessonId}/assignments`)

    if (error) throw new Error(error.message)
    return data || null
  },

  async saveAssignmentData(
    lessonId: string,
    courseId: string,
    _tenantId: string,
    data: AssignmentBlockData
  ) {
    if (data.id) {
      const { data: result, error } = await apiFetch(`/v1/assignments/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: data.title,
          instructions: data.instructions,
          max_points: data.max_points,
          max_attempts: data.max_attempts,
          is_published: data.is_published,
          due_date: data.due_date
        })
      })
      if (error) throw new Error(error.message)
      return result
    } else {
      const { data: result, error } = await apiFetch(`/v1/lessons/${lessonId}/assignments`, {
        method: 'POST',
        body: JSON.stringify({
          course_id: courseId,
          title: data.title,
          instructions: data.instructions,
          max_points: data.max_points,
          max_attempts: data.max_attempts,
          is_published: data.is_published,
          due_date: data.due_date
        })
      })
      if (error) throw new Error(error.message)
      return result
    }
  },
}
