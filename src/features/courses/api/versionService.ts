import { apiFetch } from '@/src/lib/api'
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
  async fetchCourseVersions(_courseId: string) {
    const { data, error } = await apiFetch('/v1/course_versions')

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
    const { data, error } = await apiFetch('/v1/rpc/save_course_version', { method: 'POST', body: JSON.stringify({
          p_course_id: courseId,
          p_message: commitMessage,
        }) })

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
    const { data, error } = await apiFetch('/v1/rpc/restore_course_version', { method: 'POST', body: JSON.stringify({
          p_version_id: versionId,
        }) })

    if (error) {
      logDevError('versionService', 'Error restoring course version:', error)
      throw error
    }

    return data
  },
}
