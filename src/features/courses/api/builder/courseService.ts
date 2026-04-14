import { apiFetch } from '@/src/lib/api'
import { mapCourse } from '@/src/shared/types/courseMappers'
import { DomainCourse } from '@/src/shared/types/courseTypes'
import { mapModule } from '@/src/shared/types/moduleMappers'
import { DomainModule } from '@/src/shared/types/moduleTypes'

interface BuilderLessonRow {
  order: number
  [key: string]: unknown
}

/**
 * Course Service for Course Builder (refactored)
 */
export const builderCourseService = {
  /**
   * Stage 1: Fetch modules + lessons (no blocks)
   * Refactored to return Domain Models
   */
  async fetchCourseStructure(
    courseId: string,
    tenantId: string
  ): Promise<{
    course: DomainCourse
    modules: DomainModule[]
  }> {
    const { data: course, error: courseErr } = await apiFetch('/courses')

    if (courseErr || !course) throw new Error('Materi tidak ditemukan')

    const { data: modules, error: modErr } = await apiFetch('/course_modules')

    if (modErr) throw new Error(modErr.message)

    // Sort lessons within each module
    const sorted = (modules || []).map((m) => ({
      ...m,
      description: null,
      lessons: ((m as unknown as { lessons?: BuilderLessonRow[] }).lessons || []).sort(
        (a: BuilderLessonRow, b: BuilderLessonRow) => a.order - b.order
      ),
    }))

    return {
      course: mapCourse(course),
      modules: sorted.map(mapModule),
    }
  },

  /** Use RPC to publish a course and update status/publishing timestamps */
  async publishCourse(courseId: string, _tenantId: string): Promise<void> {
    const { error } = await apiFetch('/rpc/rpc_publish_course', { method: 'POST', body: JSON.stringify({
          p_course_id: courseId,
        }) })
    if (error) throw new Error(error.message)
  },

  /** Manually drafted via update instead of full RPC for now, for completeness */
  async draftCourse(courseId: string, tenantId: string): Promise<void> {
    const { error } = await apiFetch('/courses')
    if (error) throw new Error(error.message)
  },

  async submitForReview(courseId: string, tenantId: string): Promise<void> {
    const { error } = await apiFetch('/courses')
    if (error) throw new Error(error.message)
  },

  async approveCourse(courseId: string, tenantId: string): Promise<void> {
    const { error } = await apiFetch('/courses')
    if (error) throw new Error(error.message)
  },
}
