/**
 * adminQuiz.service.ts — Admin-level quiz analytics service
 *
 * Provides aggregated quiz data across all classes within a tenant.
 * Used by the Admin Quiz Overview dashboard.
 */

import { db } from "@/services/db";
import { validateArray } from "@/shared/lib/validate";
import { QuizRowSchema } from "@/shared/schemas";
import { logger } from "@/utils/logger";

// ─── Types ───────────────────────────────────────────────

export interface AdminQuizOverviewItem {
  quiz_id: string;
  quiz_title: string;
  class_name: string | null;
  teacher_name: string | null;
  status: string;
  question_count: number;
  total_attempts: number;
  avg_score: number | null;
  pass_rate: number | null;
  created_at: string;
}

export interface AntiCheatAuditEntry {
  signal_id: string;
  attempt_id: string;
  student_name: string;
  quiz_title: string;
  signal_type: string;
  signal_count: number;
  created_at: string;
}

// ─── Service ─────────────────────────────────────────────

/**
 * Get anti-cheat audit log for school-wide admin view.
 * Returns recent cheating signals across all quizzes in the tenant.
 */
export async function getAntiCheatAuditLog(
  tenantId: string,
  limit = 50,
): Promise<AntiCheatAuditEntry[]> {
  const { data: signals, error } = await db
    .from("quiz_cheating_signals")
    .select("id, attempt_id, signal_type, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (import.meta.env.DEV)
      logger.error("Error fetching anti-cheat audit log:", error);
    throw error;
  }

  const safeSignals = (signals ?? []) as Array<{
    id: string;
    attempt_id: string;
    signal_type: string;
    created_at: string;
  }>;
  if (safeSignals.length === 0) return [];

  const attemptIds = safeSignals.map((s) => s.attempt_id);

  const [{ data: attempts }, { data: profiles }, { data: quizzes }] =
    await Promise.all([
      attemptIds.length > 0
        ? db
            .from<
              Array<{ id: string; student_id: string; quiz_id: string }>
            >("quiz_attempts_v2")
            .select("id, student_id, quiz_id")
            .in("id", attemptIds)
        : Promise.resolve({ data: [], error: null }),
      db
        .from<Array<{ id: string; full_name: string | null }>>("profiles")
        .select("id, full_name")
        .eq("tenant_id", tenantId),
      db
        .from<Array<{ id: string; title: string | null }>>("quizzes")
        .select("id, title")
        .eq("tenant_id", tenantId),
    ]);

  const attemptMap = new Map(
    (
      (attempts ?? []) as Array<{
        id: string;
        student_id: string;
        quiz_id: string;
      }>
    ).map((a) => [a.id, a]),
  );
  const profileMap = new Map(
    ((profiles ?? []) as Array<{ id: string; full_name: string | null }>).map(
      (p) => [p.id, p.full_name],
    ),
  );
  const quizMap = new Map(
    ((quizzes ?? []) as Array<{ id: string; title: string | null }>).map(
      (q) => [q.id, q.title],
    ),
  );

  return safeSignals.map((row) => {
    const attempt = attemptMap.get(row.attempt_id);
    return {
      signal_id: row.id,
      attempt_id: row.attempt_id,
      student_name: attempt
        ? (profileMap.get(attempt.student_id) ?? "Siswa")
        : "Siswa",
      quiz_title: attempt ? (quizMap.get(attempt.quiz_id) ?? "-") : "-",
      signal_type: row.signal_type,
      signal_count: 1,
      created_at: row.created_at,
    };
  });
}

/**
 * Get school-wide quiz overview for admin dashboard.
 * Returns all quizzes in the tenant with aggregated stats.
 */
export async function getSchoolQuizOverview(
  tenantId: string,
): Promise<AdminQuizOverviewItem[]> {
  const { data: quizzes, error } = await db
    .from<
      Array<{
        id: string;
        title: string;
        status: string;
        created_at: string;
        class_id: string | null;
      }>
    >("quizzes")
    .select("id, title, status, created_at, class_id")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) {
    if (import.meta.env.DEV)
      logger.error("Error fetching school quizzes:", error);
    throw error;
  }
  validateArray(
    QuizRowSchema,
    quizzes || [],
    "adminQuiz.getSchoolQuizOverview",
  );

  const safeQuizzes = quizzes as Array<{
    id: string;
    title: string;
    status: string;
    created_at: string;
    class_id: string | null;
  }> | null;

  if (!safeQuizzes || safeQuizzes.length === 0) return [];

  const quizIds = safeQuizzes.map((q) => q.id);
  const classIds = safeQuizzes.map((quiz) => quiz.class_id).filter(Boolean);

  const [
    { data: stats },
    { data: questions },
    { data: classes, error: classesError },
  ] = await Promise.all([
    db
      .from<
        Array<{
          quiz_id: string;
          total_attempts: number;
          avg_score: number | null;
          pass_rate: number | null;
        }>
      >("quiz_stats")
      .select("quiz_id, total_attempts, avg_score, pass_rate")
      .in("quiz_id", quizIds)
      .eq("tenant_id", tenantId),
    db
      .from<Array<{ id: string; quiz_id: string }>>("quiz_questions")
      .select("id, quiz_id")
      .in("quiz_id", quizIds)
      .eq("tenant_id", tenantId),
    classIds.length > 0
      ? db
          .from<
            Array<{
              id: string;
              name: string | null;
              teacher_id: string | null;
            }>
          >("classes")
          .select("id, name, teacher_id")
          .eq("tenant_id", tenantId)
          .in("id", classIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (classesError) throw classesError;

  const teacherIds = ((classes ?? []) as Array<{ teacher_id: string | null }>)
    .map((klass) => klass.teacher_id)
    .filter((teacherId): teacherId is string => Boolean(teacherId));

  const { data: teachers, error: teacherError } =
    teacherIds.length > 0
      ? await db
          .from<
            Array<{
              id: string;
              full_name: string | null;
              email: string | null;
            }>
          >("profiles")
          .select("id, full_name")
          .eq("tenant_id", tenantId)
          .in("id", teacherIds)
      : { data: [], error: null };

  if (teacherError) throw teacherError;

  const statsMap = new Map<
    string,
    {
      total_attempts: number;
      avg_score: number | null;
      pass_rate: number | null;
    }
  >(
    (
      (stats as Array<{
        quiz_id: string;
        total_attempts: number;
        avg_score: number | null;
        pass_rate: number | null;
      }>) ?? []
    ).map((s) => [s.quiz_id, s]),
  );

  // ...

  return safeQuizzes.map((q) => {
    const stats = statsMap.get(q.id);
    const questionsForQuiz = (questions ?? []).filter(
      (qq) => qq.quiz_id === q.id,
    );
    const teacher =
      (teachers ?? []).find((t) =>
        (classes ?? [])
          .filter((c) => c.id === q.class_id)
          .some((c) => c.teacher_id === t.id),
      ) ?? null;

    return {
      quiz_id: q.id,
      quiz_title: q.title,
      class_name:
        (classes ?? []).find((c) => c.id === q.class_id)?.name ?? null,
      teacher_name: teacher?.full_name ?? null,
      status: q.status,
      question_count: questionsForQuiz.length,
      total_attempts: stats?.total_attempts ?? 0,
      avg_score: stats?.avg_score ?? null,
      pass_rate: stats?.pass_rate ?? null,
      created_at: q.created_at,
    };
  });
}
