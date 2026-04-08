import { supabase } from '@/services/supabase/client'

import type { LessonMonitorData } from '../types'

// ── Lesson Monitor API ───────────────────────────────────────────────────────

/**
 * Fetches live lesson progress data for teacher monitoring dashboard.
 * Uses RPC get_lesson_progress_monitor to get real-time progress data.
 */
export async function fetchLessonMonitorData(
  courseId: string,
  tenantId: string
): Promise<LessonMonitorData> {
  const empty: LessonMonitorData = {
    liveProgress: [],
    studentActivity: [],
    timeline: [],
    summary: {
      totalActiveStudents: 0,
      totalLessonsInProgress: 0,
      studentsNeedingHelp: 0,
      averageCompletionRate: 0,
    },
  }

  const { data, error } = await supabase.rpc('get_lesson_progress_monitor', {
    p_course_id: courseId,
    p_tenant_id: tenantId,
  })

  if (error) {
    if (error.code === 'PGRST202') {
      if (import.meta.env.DEV) {
        console.warn('get_lesson_progress_monitor RPC not available, returning empty payload')
      }
      return empty
    }
    if (import.meta.env.DEV) {
      console.error('Failed to fetch lesson monitor data:', error)
    }
    throw new Error('Gagal memuat data monitor pelajaran. Silakan coba lagi.')
  }

  return (data as LessonMonitorData) || empty
}
