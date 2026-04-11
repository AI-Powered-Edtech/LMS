import { db } from '@/services/db'
import { logDevError } from '@/utils/logDevError'

// --- Types ---

export interface AttemptDetailAnswer {
  question_id: string
  question_text: string
  question_position: number
  question_type: 'MCQ' | 'TRUE_FALSE' | 'MULTIPLE_SELECT' | 'SHORT_ANSWER' | 'ESSAY'
  selected_option_id: string | null
  selected_option_ids: string[]
  selected_option_text: string | null
  text_answer: string | null
  correct_option_id: string | null
  correct_option_text: string | null
  is_correct: boolean | null
  points_earned: number | null
  max_points: number
  grader_comment: string | null
  graded_at: string | null
  graded_by: string | null
  explanation: string | null
}

export interface QuizStats {
  quiz_id: string
  tenant_id: string
  total_attempts: number
  total_unique_students: number
  avg_score: number
  median_score: number
  highest_score: number
  lowest_score: number
  avg_time_seconds: number
  pass_rate: number
  updated_at: string
}

export interface QuestionDifficulty {
  question_id: string
  question_text: string
  question_position: number
  correct_count: number
  total_attempts: number
  difficulty_percent: number
}

// --- Question Stats types (merged from quizAnalytics.service.ts) ---

interface QuestionStats {
  id: string
  question_id: string
  quiz_id: string
  tenant_id: string
  total_answers: number
  correct_answers: number
  difficulty_rate: number
  avg_time_seconds: number
  updated_at: string
}

export interface QuestionStatsWithQuestion extends QuestionStats {
  question_text: string
  question_order: number
}

/**
 * Live status row returned by get_quiz_live_status RPC.
 * One row per student who has started/submitted the assignment.
 */
export interface QuizLiveStatus {
  student_id: string
  student_name: string
  /** Values: 'in_progress' | 'submitted' | 'graded' | 'abandoned' */
  status: string
  answered_count: number
  total_questions: number
  last_heartbeat_at: string | null
  score: number | null
  is_suspicious: boolean
  tab_switch_count: number
  started_at: string
  submitted_at: string | null
}

// --- Service ---

export const quizAnalyticsService = {
  /**
   * Fetch detailed answers for a specific quiz attempt.
   * Shows student's selected option vs correct option per question.
   */
  async getAttemptDetail(attemptId: string): Promise<AttemptDetailAnswer[]> {
    const { data, error } = await db.rpc('get_attempt_detail', {
      p_attempt_id: attemptId,
    })

    if (error) {
      logDevError('quizAnalytics', 'Error fetching attempt detail:', error)
      throw error
    }

    return (data ?? []) as AttemptDetailAnswer[]
  },

  /**
   * Fetch question difficulty statistics for a quiz.
   * Returns percentage of students who answered each question correctly.
   */
  async getQuestionDifficulty(assignmentId: string): Promise<QuestionDifficulty[]> {
    const { data, error } = await db.rpc('get_question_difficulty', {
      p_assignment_id: assignmentId,
    })

    if (error) {
      logDevError('quizAnalytics', 'Error fetching question difficulty:', error)
      throw error
    }

    return (data ?? []) as QuestionDifficulty[]
  },

  /**
   * Fetch quiz stats from the precomputed quiz_stats table.
   */
  async getQuizStats(quizId: string, tenantId?: string): Promise<QuizStats | null> {
    let query = db
      .from('quiz_stats')
      .select(
        'quiz_id, tenant_id, total_attempts, total_unique_students, avg_score, median_score, highest_score, lowest_score, avg_time_seconds, pass_rate, updated_at'
      )
      .eq('quiz_id', quizId)

    // Tenant isolation — filter by tenant_id when available
    if (tenantId) {
      query = query.eq('tenant_id', tenantId)
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      logDevError('quizAnalytics', 'Error fetching quiz stats:', error)
      throw error
    }

    return data as QuizStats | null
  },

  /**
   * Generate CSV string from gradebook attempt data.
   * Pure frontend export — no server-side processing needed.
   */
  exportGradebookCSV(
    attempts: {
      profiles?: { full_name: string } | null
      quizzes?: { title: string } | null
      score: number | null
      passed: boolean | null
      time_spent: number | null
      submitted_at: string | null
    }[]
  ): string {
    const headers = [
      'Nama Siswa',
      'Judul Kuis',
      'Skor',
      'Status',
      'Waktu (detik)',
      'Tanggal Submit',
    ]

    const headerStr = headers.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')

    // ⚡ Perf: pre-compute dynamic template literals into a cached string mapping to prevent string allocation memory overhead inside nested .map loops
    const rows = attempts.map((a) => {
      const name = a.profiles?.full_name || 'Siswa'
      const title = a.quizzes?.title || '-'
      const score = a.score?.toString() ?? '-'
      const passed = a.passed === true ? 'Lulus' : a.passed === false ? 'Tidak Lulus' : '-'
      const time = a.time_spent?.toString() ?? '-'
      const date = a.submitted_at
        ? new Date(a.submitted_at).toLocaleString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '-'

      return `"${name.replace(/"/g, '""')}","${title.replace(/"/g, '""')}","${score.replace(/"/g, '""')}","${passed.replace(/"/g, '""')}","${time.replace(/"/g, '""')}","${date.replace(/"/g, '""')}"`
    })

    const csvContent = [headerStr, ...rows].join('\n')

    return csvContent
  },

  /**
   * Trigger CSV file download in the browser.
   */
  downloadCSV(csvContent: string, filename: string): void {
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }) // BOM for Excel
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  },

  /**
   * Get live status of all students taking a quiz (teacher only).
   * Polling-based — call every 10 seconds.
   */
  async getLiveStatus(assignmentId: string, tenantId: string): Promise<QuizLiveStatus[]> {
    const { data, error } = await db.rpc('get_quiz_live_status', {
      p_assignment_id: assignmentId,
      p_tenant_id: tenantId,
    })
    if (error) {
      logDevError('quizAnalytics', 'Error fetching live status:', error)
      throw error
    }
    return (data ?? []) as QuizLiveStatus[]
  },
}

// --- Standalone functions (merged from quizAnalytics.service.ts) ---

/**
 * Get question-level statistics for a specific quiz
 */
export async function getQuestionStats(quizId: string): Promise<QuestionStatsWithQuestion[]> {
  // Get question stats
  const { data: stats, error } = await db
    .from('question_stats')
    .select(
      'id, question_id, quiz_id, tenant_id, total_answers, correct_answers, difficulty_rate, avg_time_seconds, updated_at'
    )
    .eq('quiz_id', quizId)
    .order('question_id', { ascending: true })

  if (error) {
    logDevError('quizAnalytics', 'Error fetching question stats:', error)
    return []
  }

  if (!stats || stats.length === 0) {
    return []
  }

  // Get question text and order for display
  const questionIds = stats.map((s) => s.question_id)
  const { data: questions, error: questionError } = await db
    .from('quiz_questions')
    .select('id, text, "order"')
    .in('id', questionIds)

  if (questionError) {
    logDevError('quizAnalytics', 'Error fetching questions:', questionError)
    return stats.map((s) => ({
      ...s,
      question_text: 'Question',
      question_order: 0,
    })) as QuestionStatsWithQuestion[]
  }

  // Merge stats with question info
  return stats.map((stat) => {
    const question = questions?.find((q) => q.id === stat.question_id)
    return {
      ...stat,
      question_text: question?.text?.substring(0, 80) || 'Question',
      question_order: question?.order || 0,
    } as QuestionStatsWithQuestion
  })
}
