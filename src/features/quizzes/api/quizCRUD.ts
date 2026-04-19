// ==========================================================================
// Quiz CRUD — quizCRUD.ts
//
// Create, read, update, delete, and status management for quizzes.
// Extracted from quizManager.service.ts for modularity.
// ==========================================================================

import { db } from "@/services/db";
import { logger } from "@/utils/logger";

import type { QuizMode } from "../types/quizzes.types";

interface QuizQuestionRow {
  id: string;
  quiz_id: string;
  text: string;
  order: number;
  question_type: string;
  points: number;
  explanation?: string | null;
  tenant_id?: string;
}

interface QuizOptionRow {
  id: string;
  question_id: string;
  text: string;
  is_correct?: boolean;
}

// ── Helper ─────────────────────────────────────────────────────

export function deriveAssignmentStatus(
  quizStatus: string,
  availableFrom?: string | null,
  dueAt?: string | null,
): "draft" | "active" | "scheduled" | "ended" {
  if (quizStatus !== "published") return "draft";

  const now = Date.now();
  if (dueAt && new Date(dueAt).getTime() < now) return "ended";
  if (availableFrom && new Date(availableFrom).getTime() > now)
    return "scheduled";
  return "active";
}

// ── Read Operations ────────────────────────────────────────────

/**
 * Get all quizzes for a teacher (tenant-level)
 */
export async function getTeacherQuizzes(tenantId: string) {
  const { data, error } = await db
    .from<any>("quizzes")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const quizzes = (data ?? []) as Array<Record<string, unknown>>;
  const quizIds = quizzes.map((quiz) => String(quiz.id)).filter(Boolean);
  if (quizIds.length === 0) return [];

  const [
    { data: assignments, error: assignmentError },
    { data: questions, error: questionError },
  ] = await Promise.all([
    db
      .from<any>("quiz_assignments")
      .select("id, quiz_id, class_id")
      .eq("tenant_id", tenantId)
      .in("quiz_id", quizIds),
    db
      .from<any>("quiz_questions")
      .select("id, quiz_id")
      .eq("tenant_id", tenantId)
      .in("quiz_id", quizIds),
  ]);

  if (assignmentError) throw assignmentError;
  if (questionError) throw questionError;

  const assignmentCountByQuiz = new Map<string, number>();
  ((assignments ?? []) as Array<Record<string, unknown>>).forEach(
    (assignment) => {
      const quizId = String(assignment.quiz_id);
      assignmentCountByQuiz.set(
        quizId,
        (assignmentCountByQuiz.get(quizId) ?? 0) + 1,
      );
    },
  );

  const questionCountByQuiz = new Map<string, number>();
  ((questions ?? []) as Array<Record<string, unknown>>).forEach((question) => {
    const quizId = String(question.quiz_id);
    questionCountByQuiz.set(quizId, (questionCountByQuiz.get(quizId) ?? 0) + 1);
  });

  return quizzes.map((quiz) => ({
    ...quiz,
    assignment_count: assignmentCountByQuiz.get(String(quiz.id)) ?? 0,
    question_count: questionCountByQuiz.get(String(quiz.id)) ?? 0,
  }));
}

/**
 * Get quizzes by course
 */
export async function getQuizzesByCourse(courseId: string, tenantId: string) {
  const { data, error } = await db
    .from<any>("quizzes")
    .select("*")
    .eq("course_id", courseId)
    .eq("tenant_id", tenantId)
    .eq("status", "published");

  if (error) throw error;

  const quizzes = (data ?? []) as Array<Record<string, unknown>>;
  const quizIds = quizzes.map((quiz) => String(quiz.id)).filter(Boolean);
  if (quizIds.length === 0) return [];

  const { data: questions, error: questionError } = await db
    .from<any>("quiz_questions")
    .select('id, quiz_id, text, "order", question_type, points')
    .eq("tenant_id", tenantId)
    .in("quiz_id", quizIds)
    .order('"order"', { ascending: true });

  if (questionError) throw questionError;

  const questionRows = (questions ?? []) as QuizQuestionRow[];
  const questionIds = questionRows.map((question) => question.id);
  const { data: options, error: optionError } =
    questionIds.length > 0
      ? await db
          .from<any>("quiz_options")
          .select("id, question_id, text")
          .eq("tenant_id", tenantId)
          .in("question_id", questionIds)
      : { data: [], error: null };

  if (optionError) throw optionError;

  const optionsByQuestion = new Map<string, QuizOptionRow[]>();
  ((options ?? []) as QuizOptionRow[]).forEach((option) => {
    const current = optionsByQuestion.get(option.question_id) ?? [];
    current.push(option);
    optionsByQuestion.set(option.question_id, current);
  });

  const questionsByQuiz = new Map<string, Array<Record<string, unknown>>>();
  questionRows.forEach((question) => {
    const current = questionsByQuiz.get(question.quiz_id) ?? [];
    current.push({
      ...question,
      quiz_options: (optionsByQuestion.get(question.id) ?? []).map(
        (option) => ({
          id: option.id,
          text: option.text,
        }),
      ),
    });
    questionsByQuiz.set(question.quiz_id, current);
  });

  return quizzes.map((quiz) => ({
    ...quiz,
    quiz_questions: questionsByQuiz.get(String(quiz.id)) ?? [],
  }));
}

/**
 * Get quizzes by class
 */
export async function getQuizzesByClass(classId: string, tenantId: string) {
  const { data, error } = await db
    .from<any>("quiz_assignments")
    .select("*")
    .eq("class_id", classId)
    .eq("tenant_id", tenantId)
    .order("available_from", { ascending: false });

  if (error) throw error;

  const assignments = (data ?? []) as Array<Record<string, unknown>>;
  const quizIds = assignments
    .map((assignment: any) => String(assignment.quiz_id))
    .filter(Boolean);
  if (quizIds.length === 0) return [];

  const [
    { data: quizzes, error: quizError },
    { data: questions, error: questionError },
  ] = await Promise.all([
    db
      .from<any>("quizzes")
      .select(
        "id, title, status, mode, time_limit_minutes, max_attempts, passing_score, created_at, updated_at, available_from, available_until, show_correct_answers, shuffle_questions, shuffle_options",
      )
      .eq("tenant_id", tenantId)
      .in("id", quizIds),
    db
      .from<any>("quiz_questions")
      .select("id, quiz_id")
      .eq("tenant_id", tenantId)
      .in("quiz_id", quizIds),
  ]);

  if (quizError) throw quizError;
  if (questionError) throw questionError;

  const quizMap = new Map(
    ((quizzes ?? []) as Array<Record<string, unknown>>).map((quiz) => [
      String(quiz.id),
      quiz,
    ]),
  );
  const questionCountByQuiz = new Map<string, number>();
  ((questions ?? []) as Array<Record<string, unknown>>).forEach((question) => {
    const quizId = String(question.quiz_id);
    questionCountByQuiz.set(quizId, (questionCountByQuiz.get(quizId) ?? 0) + 1);
  });

  return assignments
    .map((assignment: any) => {
      const quiz = quizMap.get(String(assignment.quiz_id));
      if (!quiz) return null;

      return {
        ...quiz,
        assignment_id: assignment.id,
        assignment_status: assignment.status,
        assignment_available_from: assignment.available_from,
        assignment_due_at: assignment.due_at,
        question_count:
          questionCountByQuiz.get(String(assignment.quiz_id)) ?? 0,
      };
    })
    .filter(Boolean);
}

/**
 * Get quiz with all questions and options
 */
export async function getQuizWithQuestions(quizId: string, tenantId: string) {
  const { data, error } = await db
    .from<any>("quizzes")
    .select("*")
    .eq("id", quizId)
    .eq("tenant_id", tenantId)
    .single();

  if (error) throw error;

  const { data: questions, error: questionError } = await db
    .from<any>("quiz_questions")
    .select(
      'id, quiz_id, text, "order", question_type, points, explanation, tenant_id',
    )
    .eq("quiz_id", quizId)
    .eq("tenant_id", tenantId)
    .order('"order"', { ascending: true });

  if (questionError) throw questionError;

  const questionRows = (questions ?? []) as QuizQuestionRow[];
  const questionIds = questionRows.map((question) => question.id);
  const { data: options, error: optionError } =
    questionIds.length > 0
      ? await db
          .from<any>("quiz_options")
          .select("id, question_id, text, is_correct")
          .eq("tenant_id", tenantId)
          .in("question_id", questionIds)
      : { data: [], error: null };

  if (optionError) throw optionError;

  const optionsByQuestion = new Map<string, QuizOptionRow[]>();
  ((options ?? []) as QuizOptionRow[]).forEach((option) => {
    const current = optionsByQuestion.get(option.question_id) ?? [];
    current.push(option);
    optionsByQuestion.set(option.question_id, current);
  });

  const dataRow = data as Record<string, unknown>;
  dataRow.quiz_questions = questionRows
    .map((question) => ({
      ...question,
      quiz_options: optionsByQuestion.get(question.id) ?? [],
    }))
    .sort((a, b) => a.order - b.order);

  return data;
}

// ── Write Operations ───────────────────────────────────────────

/**
 * Create a new quiz
 */
export async function createQuiz(payload: {
  title: string;
  class_id: string;
  course_id?: string;
  tenant_id: string;
  instructions?: string;
  mode?: QuizMode;
  time_limit_minutes?: number;
  max_attempts?: number;
  passing_score?: number;
  shuffle_questions?: boolean;
  shuffle_options?: boolean;
  show_correct_answers?: boolean;
  available_from?: string | null;
  due_at?: string | null;
  available_until?: string | null;
}) {
  const dueAt = payload.due_at ?? payload.available_until ?? null;

  const { data, error } = await db
    .from<any>("quizzes")
    .insert({
      title: payload.title,
      origin_class_id: payload.class_id,
      class_id: null,
      course_id: payload.course_id || null,
      tenant_id: payload.tenant_id,
      instructions: payload.instructions || null,
      mode: payload.mode || "graded",
      time_limit_minutes: payload.time_limit_minutes || null,
      max_attempts: payload.max_attempts || 3,
      passing_score: payload.passing_score || 70,
      shuffle_questions: payload.shuffle_questions || false,
      shuffle_options: payload.shuffle_options || false,
      show_correct_answers: payload.show_correct_answers || false,
      available_from: payload.available_from || null,
      available_until: dueAt,
      status: "draft",
    })
    .select(
      "id, title, origin_class_id, class_id, course_id, tenant_id, instructions, mode, time_limit_minutes, max_attempts, passing_score, shuffle_questions, shuffle_options, show_correct_answers, available_from, available_until, status, created_at, updated_at",
    )
    .single();

  if (error) throw error;

  // Auto-create assignment for the origin class
  const { error: assignError } = await db
    .from<{
      quiz_id: string;
      class_id: string;
      tenant_id: string;
      available_from?: string | null;
      due_at?: string | null;
      max_attempts?: number;
      status: "draft";
    }>("quiz_assignments")
    .upsert(
      {
        quiz_id: (data as { id: string }).id,
        tenant_id: payload.tenant_id,
        available_from: payload.available_from || null,
        due_at: dueAt,
        max_attempts: payload.max_attempts || 3,
        status: "draft",
      },
      { onConflict: "quiz_id,class_id" },
    );

  if (assignError) {
    if (import.meta.env.DEV)
      logger.error("Failed to auto-create quiz assignment:", assignError);
    throw assignError;
  }

  return data;
}

/**
 * Update quiz details
 */
export async function updateQuiz(
  quizId: string,
  updates: Record<string, unknown>,
  tenantId: string,
) {
  const { error } = await db
    .from<any>("quizzes")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", quizId)
    .eq("tenant_id", tenantId);

  if (error) throw error;
}

/**
 * Delete a quiz
 */
export async function deleteQuiz(quizId: string, tenantId: string) {
  const { error } = await db
    .from<any>("quizzes")
    .delete()
    .eq("id", quizId)
    .eq("tenant_id", tenantId);

  if (error) throw error;
}

/**
 * Set quiz status (draft/published)
 */
export async function setQuizStatus(
  quizId: string,
  status: "draft" | "published",
  tenantId: string,
) {
  const { error } = await db
    .from<any>("quizzes")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", quizId)
    .eq("tenant_id", tenantId);

  if (error) throw error;

  // Update all related assignment statuses
  const { data: assignments, error: assignmentError } = await db
    .from<any>("quiz_assignments")
    .select("id, available_from, due_at")
    .eq("quiz_id", quizId)
    .eq("tenant_id", tenantId);

  if (assignmentError) throw assignmentError;

  const safeAssignments = assignments as Array<{
    id: string;
    available_from: string | null;
    due_at: string | null;
  }> | null;
  if (!safeAssignments || safeAssignments.length === 0) return;

  await Promise.all(
    safeAssignments.map((assignment) =>
      db
        .from<any>("quiz_assignments")
        .update({
          status: deriveAssignmentStatus(
            status,
            assignment.available_from,
            assignment.due_at,
          ),
        })
        .eq("id", assignment.id)
        .eq("tenant_id", tenantId),
    ),
  );
}
