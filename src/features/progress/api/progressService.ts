import { supabase } from '@/src/lib/supabase'

export interface StudentProgressData {
  profile: {
    id: string
    full_name: string
    avatar_url: string
  } | null
  totalXP: number
  completedLessonsCount: number
  quizAttempts: {
    id: string
    quiz_id: string
    score: number
    created_at: string
  }[]
  achievements: {
    id: string
    earned_at: string
    badges: {
      name: string
      icon: string | null
    } | null
  }[]
  courseProgress: {
    id: string
    course_id: string
    total_lessons: number
    completed_lessons: number
    percentage: number
    last_activity_type: string | null
    last_activity_at: string | null
    courses: {
      title: string
    } | null
  }[]
}
export const progressService = {
  async getStudentProgressBundle(studentId: string): Promise<StudentProgressData> {
    try {
      const { data, error } = await supabase.rpc('get_student_progress_bundle', {
        p_student_id: studentId,
      })

      if (error) throw error

      // Map database snake_case result to frontend camelCase if necessary,
      // but the RPC was designed to match the interface as much as possible.
      // Note: The interface uses camelCase, database uses snake_case.
      return {
        profile: data.profile,
        totalXP: data.total_xp,
        completedLessonsCount: data.completed_lessons_count,
        quizAttempts: data.quiz_attempts || [],
        achievements: (data.achievements || []).map((a: any) => ({
          id: a.id,
          earned_at: a.earned_at,
          badges: {
            name: a.name,
            icon: a.icon,
          },
        })),
        courseProgress: (data.course_progress || []).map((cp: any) => ({
          id: cp.id,
          course_id: cp.course_id,
          total_lessons: cp.total_lessons,
          completed_lessons: cp.completed_lessons,
          percentage: cp.percentage,
          last_activity_type: cp.last_activity_type,
          last_activity_at: cp.last_activity_at,
          courses: {
            title: cp.title,
          },
        })),
      }
    } catch (error) {
      console.error('Error fetching student progress bundle:', error)
      throw error
    }
  },
  // Keep individual method for now but getStudentProgressBundle is preferred
  async getStudentProgress(studentId: string): Promise<StudentProgressData> {
    return this.getStudentProgressBundle(studentId)
  },
}
