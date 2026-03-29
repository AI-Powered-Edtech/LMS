import { supabase } from '@/src/services/supabase/client'
import { logDevError } from '@/src/utils/logDevError'

export interface CourseVersion {
  id: string
  course_id: string
  version_number: number
  commit_message: string | null
  created_at: string
  created_by: string
  tenant_id: string
}

export const versionService = {
  /**
   * Fetches the version history for a course without the heavy snapshot data
   */
  async fetchCourseVersions(courseId: string, tenantId: string) {
    const { data, error } = await supabase
      .from('course_versions')
      .select('id, course_id, version_number, commit_message, created_at, created_by, tenant_id')
      .eq('course_id', courseId)
      .eq('tenant_id', tenantId)
      .order('version_number', { ascending: false })

    if (error) {
      logDevError('versionService', 'Error fetching course versions:', error)
      throw error
    }

    return data as CourseVersion[]
  },

  /**
   * Saves a new version (checkpoint) of a course
   */
  async saveCourseVersion(courseId: string, commitMessage: string) {
    const { data, error } = await supabase.rpc('save_course_version', {
      p_course_id: courseId,
      p_message: commitMessage,
    })

    if (error) {
      logDevError('versionService', 'Error saving course version:', error)
      throw error
    }

    return data
  },

  /**
   * Restores a course to a specific version
   */
  async restoreCourseVersion(versionId: string) {
    const { data, error } = await supabase.rpc('restore_course_version', {
      p_version_id: versionId,
    })

    if (error) {
      logDevError('versionService', 'Error restoring course version:', error)
      throw error
    }

    return data
  },
}
