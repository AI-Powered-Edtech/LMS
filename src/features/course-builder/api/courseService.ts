import { db } from '@/services/db'
import { mapCourse } from '@/shared/types/courseMappers'
import { DomainCourse } from '@/shared/types/courseTypes'
import { mapModule } from '@/shared/types/moduleMappers'
import { DomainModule } from '@/shared/types/moduleTypes'

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
    const { data: courses, error: courseErr } = await db
      .from('courses')
      .select('id, title, description, status, created_at, updated_at, tenant_id')
      .eq('id', courseId)
      .eq('tenant_id', tenantId)
      .limit(1)

    const course = courses?.[0]

    if (courseErr || !course) {
      console.error('Course fetch error:', courseErr, 'Course:', course);
      throw new Error('Materi tidak ditemukan')
    }

    const { data: modules, error: modErr } = await db
      .from('course_modules')
      .select('id, title, "order", course_id, tenant_id')
      .eq('course_id', courseId)
      .eq('tenant_id', tenantId)
      .order('order', { ascending: true })

    if (modErr) throw new Error(modErr.message)

    const moduleRows = (modules ?? []) as Array<Record<string, unknown>>
    const moduleIds = moduleRows.map((module) => String(module.id)).filter(Boolean)

    let lessonRows: Array<Record<string, unknown>> = []
    if (moduleIds.length > 0) {
      const { data: lessons, error: lessonErr } = await db
        .from('lessons')
        .select(
          'id, module_id, title, "order", type, is_published, duration_minutes, passing_score, tenant_id'
        )
        .eq('tenant_id', tenantId)
        .in('module_id', moduleIds)
        .order('order', { ascending: true })

      if (lessonErr) throw new Error(lessonErr.message)
      lessonRows = (lessons ?? []) as Array<Record<string, unknown>>
    }

    const lessonsByModule = new Map<string, BuilderLessonRow[]>()
    lessonRows.forEach((lesson) => {
      const moduleId = String(lesson.module_id)
      const current = lessonsByModule.get(moduleId) ?? []
      current.push(lesson as BuilderLessonRow)
      lessonsByModule.set(moduleId, current)
    })

    const sorted = moduleRows.map((module) => ({
      ...module,
      description: null,
      lessons: (lessonsByModule.get(String(module.id)) ?? []).sort(
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
    const { error } = await db.rpc('rpc_publish_course', {
      p_course_id: courseId,
    })
    if (error) throw new Error(error.message)
  },

  /** Manually drafted via update instead of full RPC for now, for completeness */
  async draftCourse(courseId: string, tenantId: string): Promise<void> {
    const { error } = await db
      .from('courses')
      .update({ status: 'draft' })
      .eq('id', courseId)
      .eq('tenant_id', tenantId)
    if (error) throw new Error(error.message)
  },

  async submitForReview(courseId: string, tenantId: string): Promise<void> {
    const { error } = await db
      .from('courses')
      .update({ status: 'in_review' })
      .eq('id', courseId)
      .eq('tenant_id', tenantId)
    if (error) throw new Error(error.message)
  },

  async approveCourse(courseId: string, tenantId: string): Promise<void> {
    const { error } = await db
      .from('courses')
      .update({ status: 'approved' })
      .eq('id', courseId)
      .eq('tenant_id', tenantId)
    if (error) throw new Error(error.message)
  },
}
