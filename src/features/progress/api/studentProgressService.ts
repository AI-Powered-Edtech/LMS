import { supabase } from '@/src/services/supabase/client'

// --- Types (shared with consumers) ---

type LessonStatus = 'locked' | 'unlocked' | 'in_progress' | 'completed'
export type ModuleStatus = 'locked' | 'active' | 'mastered' | 'needs_review'

interface LessonProgress {
  lessonId: string
  moduleId: string
  status: LessonStatus
  progress: number
  score?: number
  lastAccessed?: Date
}

interface QuizAttempt {
  id: string
  quizId: string
  score: number
  totalPoints: number
  percentage: number
  passed: boolean
  completedAt: Date
  answers: Record<string, string>
}

interface ModuleData {
  id: string
  title: string
  status: ModuleStatus
  position: { x: number; y: number }
  prerequisiteId?: string
  minScoreToPass?: number
}

export interface AchievementData {
  id: string
  title: string
  icon: string
  unlockedAt?: Date
}

interface AssignmentData {
  id: string
  title: string
  subject: string
  dueDate: Date
  type: 'Tugas' | 'Kuis' | 'Proyek' | 'Review'
  urgent: boolean
  progress: number
}

// --- Fetch Functions ---

export const studentProgressService = {
  /**
   * Fetch course modules for a specific tenant, ordered by position.
   */
  async fetchModules(tenantId: string): Promise<ModuleData[]> {
    const { data } = await supabase
      .from('course_modules')
      .select('id, title, order, course_id')
      .eq('tenant_id', tenantId)
      .order('order')

    return (data ?? []).map((m, i) => ({
      id: m.id,
      title: m.title,
      status: (i === 0 ? 'active' : 'locked') as ModuleStatus,
      position: { x: 50, y: i * 20 + 10 },
    }))
  },

  /**
   * Fetch lesson progress for a specific user within a tenant.
   */
  async fetchLessonProgress(
    userId: string,
    tenantId: string
  ): Promise<Record<string, LessonProgress>> {
    const { data } = await supabase
      .from('lesson_progress')
      .select('lesson_id, completed, completed_at')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)

    const progressMap: Record<string, LessonProgress> = {}
    ;(data ?? []).forEach((p) => {
      progressMap[p.lesson_id] = {
        lessonId: p.lesson_id,
        moduleId: p.lesson_id,
        status: p.completed ? 'completed' : 'in_progress',
        progress: p.completed ? 100 : 50,
        lastAccessed: p.completed_at ? new Date(p.completed_at) : undefined,
      }
    })
    return progressMap
  },

  /**
   * Fetch quiz attempts for a specific user within a tenant.
   */
  async fetchQuizAttempts(
    userId: string,
    tenantId: string
  ): Promise<Record<string, QuizAttempt[]>> {
    const { data } = await supabase
      .from('quiz_attempts_v2')
      .select('id, quiz_id, score, started_at, submitted_at, passed')
      .eq('student_id', userId)
      .eq('tenant_id', tenantId)
      .in('status', ['SUBMITTED', 'GRADED'])
      .order('submitted_at', { ascending: false })

    const attemptsMap: Record<string, QuizAttempt[]> = {}
    ;(data ?? []).forEach((a) => {
      const attempt: QuizAttempt = {
        id: a.id,
        quizId: a.quiz_id,
        score: a.score ?? 0,
        totalPoints: 100,
        percentage: a.score ?? 0,
        passed: a.passed ?? (a.score ?? 0) >= 70,
        completedAt: new Date(a.submitted_at || a.started_at),
        answers: {},
      }
      if (!attemptsMap[a.quiz_id]) attemptsMap[a.quiz_id] = []
      attemptsMap[a.quiz_id].push(attempt)
    })
    return attemptsMap
  },

  /**
   * Fetch user XP total within a tenant.
   */
  async fetchXP(userId: string, tenantId: string): Promise<number> {
    const { data, error } = await supabase
      .from('user_points')
      .select('points')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
    if (error) return 0
    return (data ?? []).reduce((sum, row) => sum + (row.points ?? 0), 0)
  },

  /**
   * Fetch user badges/achievements within a tenant.
   */
  async fetchAchievements(userId: string, tenantId: string): Promise<AchievementData[]> {
    const { data, error } = await supabase
      .from('user_badges')
      .select('id, earned_at, badges(name, icon)')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)

    if (error) return []

    return (data ?? []).map((b) => ({
      id: b.id,
      title: (b as unknown as { badges?: { name: string; icon: string } }).badges?.name ?? 'Badge',
      icon: (b as unknown as { badges?: { name: string; icon: string } }).badges?.icon ?? 'star',
      unlockedAt: b.earned_at ? new Date(b.earned_at) : undefined,
    }))
  },

  /**
   * Fetch upcoming assignments for a tenant (limited to 10).
   */
  async fetchAssignments(tenantId: string): Promise<AssignmentData[]> {
    const { data } = await supabase
      .from('assignments')
      .select('id, title, due_date, classes(name)')
      .eq('tenant_id', tenantId)
      .order('due_date', { ascending: true })
      .limit(10)

    return (data ?? []).map((a) => ({
      id: a.id,
      title: a.title,
      subject: (a as unknown as { classes?: { name: string } }).classes?.name ?? '',
      dueDate: a.due_date ? new Date(a.due_date) : new Date(),
      type: 'Tugas' as const,
      urgent: a.due_date ? new Date(a.due_date).getTime() - Date.now() < 86400000 : false,
      progress: 0,
    }))
  },

  // --- Mutation Functions ---

  /**
   * Upsert lesson progress for a user within a tenant.
   */
  async updateLessonProgress(
    userId: string,
    lessonId: string,
    completed: boolean,
    tenantId: string
  ): Promise<void> {
    const { error } = await supabase.from('lesson_progress').upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
        tenant_id: tenantId,
      },
      { onConflict: 'user_id,lesson_id' }
    )
    if (error) if (import.meta.env.DEV) console.error('Error updating lesson progress:', error)
  },

  /**
   * Submit a quiz attempt within a tenant.
   */
  async submitQuizAttempt(
    _userId: string,
    _quizId: string,
    _score: number,
    _answers: Record<string, string>,
    _tenantId: string
  ): Promise<void> {
    if (import.meta.env.DEV)
      console.warn(
        '[studentProgressService] Legacy submitQuizAttempt skipped. Quiz attempts are persisted via quiz_attempts_v2 RPC flow.'
      )
  },

  /**
   * Add XP to a user via RPC.
   */
  async addXP(userId: string, amount: number): Promise<void> {
    const { error } = await supabase.rpc('add_user_points', {
      p_user_id: userId,
      p_points: amount,
    })
    if (error) if (import.meta.env.DEV) console.error('Error adding XP:', error)
  },
}
