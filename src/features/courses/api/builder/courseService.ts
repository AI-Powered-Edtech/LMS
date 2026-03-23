import { BuilderLesson } from '@/src/features/courses/api/courseBuilderService'
import { supabase } from '@/src/services/supabase/client'
import { mapCourse } from '@/src/shared/types/courseMappers'
import { DomainCourse } from '@/src/shared/types/courseTypes'
import { mapModule } from '@/src/shared/types/moduleMappers'
import { DomainModule } from '@/src/shared/types/moduleTypes'

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
    const { data: course, error: courseErr } = await supabase
      .from('courses')
      .select('id, title, description, status, created_at, updated_at, tenant_id')
      .eq('id', courseId)
      .eq('tenant_id', tenantId)
      .single()

    if (courseErr || !course) throw new Error('Materi tidak ditemukan')

    const { data: modules, error: modErr } = await supabase
      .from('course_modules')
      .select(
        `
        id, title, "order", course_id, tenant_id,
        lessons ( id, title, "order", type, is_published, duration_minutes, passing_score, tenant_id )
      `
      )
      .eq('course_id', courseId)
      .eq('tenant_id', tenantId)
      .order('order', { ascending: true })

    if (modErr) throw new Error(modErr.message)

    // Sort lessons within each module
    const sorted = (modules || []).map((m) => ({
      ...m,
      description: null,
      lessons: ((m as unknown as { lessons?: BuilderLesson[] }).lessons || []).sort(
        (a: BuilderLesson, b: BuilderLesson) => a.order - b.order
      ),
    }))

    return {
      course: mapCourse(course),
      modules: sorted.map(mapModule),
    }
  },

  /** Use RPC to publish a course and update status/publishing timestamps */
  async publishCourse(courseId: string, _tenantId: string): Promise<void> {
    const { error } = await supabase.rpc('rpc_publish_course', {
      p_course_id: courseId,
    })
    if (error) throw new Error(error.message)
  },

  /** Manually drafted via update instead of full RPC for now, for completeness */
  async draftCourse(courseId: string, tenantId: string): Promise<void> {
    const { error } = await supabase
      .from('courses')
      .update({ status: 'draft' })
      .eq('id', courseId)
      .eq('tenant_id', tenantId)
    if (error) throw new Error(error.message)
  },
}
