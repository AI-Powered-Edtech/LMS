import { db } from "@/services/db";
import { logger } from "@/utils/logger";

// --- Types (shared with consumers) ---

type LessonStatus = "locked" | "unlocked" | "in_progress" | "completed";
export type ModuleStatus = "locked" | "active" | "mastered" | "needs_review";

interface LessonProgress {
  lessonId: string;
  moduleId: string;
  status: LessonStatus;
  progress: number;
  score?: number;
  lastAccessed?: Date;
}

interface QuizAttempt {
  id: string;
  quizId: string;
  score: number;
  totalPoints: number;
  percentage: number;
  passed: boolean;
  completedAt: Date;
  answers: Record<string, string>;
}

interface ModuleData {
  id: string;
  title: string;
  status: ModuleStatus;
  position: { x: number; y: number };
  prerequisiteId?: string;
  minScoreToPass?: number;
}

export interface AchievementData {
  id: string;
  title: string;
  icon: string;
  unlockedAt?: Date;
}

interface AssignmentData {
  id: string;
  title: string;
  subject: string;
  dueDate: Date;
  type: "Tugas" | "Kuis" | "Proyek" | "Review";
  urgent: boolean;
  progress: number;
}

// --- Fetch Functions ---

export const studentProgressService = {
  /**
   * Fetch course modules for a specific tenant, ordered by position.
   * When userId is provided, derives module status from lesson progress.
   */
  async fetchModules(tenantId: string, userId?: string): Promise<ModuleData[]> {
    const { data: moduleData } = await db
      .from<Array<{
        id: string;
        title: string;
        order: number;
        course_id: string;
      }> | null>("course_modules")
      .select("id, title, order, course_id")
      .eq("tenant_id", tenantId)
      .order("order");

    if (!moduleData || moduleData.length === 0) return [];

    if (!userId) {
      return moduleData.map((m: any, i: any) => ({
        id: m.id,
        title: m.title,
        status: (i === 0 ? "active" : "locked") as ModuleStatus,
        position: { x: 50, y: i * 20 + 10 },
      }));
    }

    const moduleIds = moduleData.map((m: any) => m.id);
    const { data: lessonData } = await db
      .from<Array<{ id: string; module_id: string }> | null>("lessons")
      .select("id, module_id")
      .in("module_id", moduleIds)
      .eq("tenant_id", tenantId);

    const { data: progressData } = await db
      .from<Array<{
        lesson_id: string;
        completed: boolean;
      }> | null>("lesson_progress")
      .select("lesson_id, completed")
      .eq("user_id", userId)
      .eq("tenant_id", tenantId);

    const completedSet = new Set(
      (progressData ?? [])
        .filter((p: any) => p.completed)
        .map((p: any) => p.lesson_id),
    );

    const lessonsByModule = new Map<string, string[]>();
    (lessonData ?? []).forEach((l: { id: string; module_id: string }) => {
      const arr = lessonsByModule.get(l.module_id) ?? [];
      arr.push(l.id);
      lessonsByModule.set(l.module_id, arr);
    });

    let prevMastered = true;
    return moduleData.map((m: any, i: any) => {
      const lessons = lessonsByModule.get(m.id) ?? [];
      const completedCount = lessons.filter((id) =>
        completedSet.has(id),
      ).length;
      const totalCount = lessons.length;

      let status: ModuleStatus;
      if (totalCount === 0) {
        status = prevMastered || i === 0 ? "active" : "locked";
      } else if (completedCount === totalCount) {
        status = "mastered";
      } else if (completedCount > 0) {
        status = "active";
      } else if (prevMastered || i === 0) {
        status = "active";
      } else {
        status = "locked";
      }

      prevMastered = status === "mastered";
      return {
        id: m.id,
        title: m.title,
        status,
        position: { x: 50, y: i * 20 + 10 },
      };
    });
  },

  /**
   * Fetch lesson progress for a specific user within a tenant.
   */
  async fetchLessonProgress(
    userId: string,
    tenantId: string,
  ): Promise<Record<string, LessonProgress>> {
    const { data } = await db
      .from<Array<{
        lesson_id: string;
        completed: boolean;
        completed_at?: string;
      }> | null>("lesson_progress")
      .select("lesson_id, completed, completed_at")
      .eq("user_id", userId)
      .eq("tenant_id", tenantId);

    const lessonIds = (data ?? []).map((row) => row.lesson_id);
    const { data: lessons } =
      lessonIds.length > 0
        ? await db
            .from<any>("lessons")
            .select("id, module_id")
            .eq("tenant_id", tenantId)
            .in("id", lessonIds)
        : { data: [] };

    const lessonModuleMap = new Map(
      ((lessons ?? []) as Array<{ id: string; module_id: string | null }>).map(
        (lesson) => [lesson.id, lesson.module_id ?? ""],
      ),
    );

    const progressMap: Record<string, LessonProgress> = {};
    (data ?? []).forEach((p) => {
      progressMap[p.lesson_id] = {
        lessonId: p.lesson_id,
        moduleId: lessonModuleMap.get(p.lesson_id) ?? "",
        status: p.completed ? "completed" : "in_progress",
        progress: p.completed ? 100 : 50,
        lastAccessed: p.completed_at ? new Date(p.completed_at) : undefined,
      };
    });
    return progressMap;
  },

  /**
   * Fetch quiz attempts for a specific user within a tenant.
   */
  async fetchQuizAttempts(
    userId: string,
    tenantId: string,
  ): Promise<Record<string, QuizAttempt[]>> {
    const { data } = await db
      .from<Array<{
        id: string;
        quiz_id: string;
        score?: number;
        started_at?: string;
        submitted_at?: string;
        passed?: boolean;
      }> | null>("quiz_attempts_v2")
      .select("id, quiz_id, score, started_at, submitted_at, passed")
      .eq("student_id", userId)
      .eq("tenant_id", tenantId)
      .in("status", ["SUBMITTED", "GRADED"])
      .order("submitted_at", { ascending: false })
      .limit(500);

    const quizIds = (data ?? []).map((attempt) => attempt.quiz_id);
    const { data: quizzes } =
      quizIds.length > 0
        ? await db
            .from<any>("quizzes")
            .select("id, total_points")
            .eq("tenant_id", tenantId)
            .in("id", quizIds)
        : { data: [] };

    const quizMap = new Map(
      (
        (quizzes ?? []) as Array<{ id: string; total_points: number | null }>
      ).map((quiz) => [quiz.id, quiz.total_points ?? 100]),
    );

    const attemptsMap: Record<string, QuizAttempt[]> = {};
    (data ?? []).forEach((a) => {
      const totalPoints = quizMap.get(a.quiz_id) ?? 100;
      const attempt: QuizAttempt = {
        id: a.id,
        quizId: a.quiz_id,
        score: a.score ?? 0,
        totalPoints,
        percentage: (() => {
          return totalPoints > 0
            ? Math.round(((a.score ?? 0) / totalPoints) * 100)
            : (a.score ?? 0);
        })(),
        passed: a.passed ?? (a.score ?? 0) >= 70,
        completedAt: new Date((a.submitted_at || a.started_at) ?? ''),
        answers: {},
      };
      if (!attemptsMap[a.quiz_id]) attemptsMap[a.quiz_id] = [];
      attemptsMap[a.quiz_id].push(attempt);
    });
    return attemptsMap;
  },

  /**
   * Fetch user XP total within a tenant.
   */
  async fetchXP(userId: string, tenantId: string): Promise<number> {
    const { data, error } = await db
      .from<Array<{ points?: number }> | null>("user_points")
      .select("points")
      .eq("user_id", userId)
      .eq("tenant_id", tenantId);
    if (error) return 0;
    return (data ?? []).reduce((sum, row) => sum + (row.points ?? 0), 0);
  },

  /**
   * Fetch user badges/achievements within a tenant.
   */
  async fetchAchievements(
    userId: string,
    tenantId: string,
  ): Promise<AchievementData[]> {
    const { data, error } = (await db
      .from<any>("user_badges")
      .select("id, badge_id, earned_at")
      .eq("user_id", userId)
      .eq("tenant_id", tenantId)) as {
      data: Array<{ id: string; badge_id: string; earned_at?: string }> | null;
      error?: any;
    };

    if (error) return [];

    const badgeIds = (data ?? []).map((badge) => badge.badge_id);
    const { data: badges, error: badgeError } =
      badgeIds.length > 0
        ? await db
            .from<Array<{ id: string; name: string; icon: string }>>("badges")
            .select("id, name, icon")
            .in("id", badgeIds)
        : { data: [], error: null };

    if (badgeError) return [];

    const badgeMap = new Map(
      ((badges ?? []) as Array<{ id: string; name: string; icon: string }>).map(
        (badge) => [badge.id, badge],
      ),
    );

    return (data ?? []).map((b) => ({
      id: b.id,
      title: badgeMap.get(b.badge_id)?.name ?? "Badge",
      icon: badgeMap.get(b.badge_id)?.icon ?? "star",
      unlockedAt: b.earned_at ? new Date(b.earned_at) : undefined,
    }));
  },

  /**
   * Fetch upcoming assignments for a specific student within a tenant.
   * FIXED: Filter by student's enrolled class IDs to show only relevant assignments.
   */
  async fetchAssignments(
    tenantId: string,
    studentId?: string,
  ): Promise<AssignmentData[]> {
    // FIXED: If studentId provided, filter assignments by classes the student is enrolled in
    let enrolledClassIds: string[] | null = null;

    if (studentId) {
      const { data: enrollments } = (await db
        .from<Array<{ id: string; class_id: string; student_id: string; status: string; joined_at: string }>>("enrollments")
        .select("class_id")
        .eq("student_id", studentId)
        .eq("tenant_id", tenantId)) as {
        data: Array<{ class_id: string }> | null;
      };

      if (enrollments && enrollments.length > 0) {
        enrolledClassIds = enrollments.map((e) => e.class_id);
      }
    }

    let query = db
      .from<any>("assignments")
      .select("id, title, due_date, class_id")
      .eq("tenant_id", tenantId)
      .order("due_date", { ascending: true })
      .limit(10);

    // FIXED: Restrict to enrolled classes only — prevents showing assignments from other classes
    if (enrolledClassIds && enrolledClassIds.length > 0) {
      query = query.in("class_id", enrolledClassIds);
    }

    const { data } = (await query) as {
      data: Array<{
        id: string;
        title: string;
        due_date?: string;
        class_id?: string;
      }> | null;
    };
    const classIds = (data ?? []).map((row) => row.class_id);
    const { data: classes } =
      classIds.length > 0
        ? await db
            .from<any>("classes")
            .select("id, name")
            .eq("tenant_id", tenantId)
            .in(
              "id",
              classIds.filter((classId): classId is string => Boolean(classId)),
            )
        : { data: [] };

    const classMap = new Map(
      ((classes ?? []) as Array<{ id: string; name: string }>).map((klass) => [
        klass.id,
        klass.name,
      ]),
    );

    return (data ?? []).map((a) => ({
      id: a.id,
      title: a.title,
      subject: a.class_id ? (classMap.get(a.class_id) ?? "") : "",
      dueDate: a.due_date ? new Date(a.due_date) : new Date(),
      type: "Tugas" as const,
      urgent: a.due_date
        ? new Date(a.due_date).getTime() - Date.now() < 86400000
        : false,
      progress: 0,
    }));
  },

  // --- Mutation Functions ---

  /**
   * Upsert lesson progress for a user within a tenant.
   */
  async updateLessonProgress(
    userId: string,
    lessonId: string,
    completed: boolean,
    tenantId: string,
  ): Promise<void> {
    const { error } = await db.from<Array<{ lesson_id: string; completed: boolean; completed_at?: string }>>("lesson_progress").upsert(
      {
        user_id: userId,
        lesson_id: lessonId,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
        tenant_id: tenantId,
      },
      { onConflict: "user_id,lesson_id" },
    );
    if (error)
      if (import.meta.env.DEV)
        logger.error("Error updating lesson progress:", error);
  },

  /**
   * Submit a quiz attempt within a tenant.
   */
  async submitQuizAttempt(
    _userId: string,
    _quizId: string,
    _score: number,
    _answers: Record<string, string>,
    _tenantId: string,
  ): Promise<void> {
    if (import.meta.env.DEV)
      logger.warn(
        "[studentProgressService] Legacy submitQuizAttempt skipped. Quiz attempts are persisted via quiz_attempts_v2 RPC flow.",
      );
  },

  /**
   * Add XP to a user via RPC.
   */
  async addXP(
    userId: string,
    amount: number,
    _tenantId: string,
  ): Promise<void> {
    const { error } = await db.rpc("add_user_points", {
      p_user_id: userId,
      p_points: amount,
    });
    if (error) if (import.meta.env.DEV) logger.error("Error adding XP:", error);
  },
};
