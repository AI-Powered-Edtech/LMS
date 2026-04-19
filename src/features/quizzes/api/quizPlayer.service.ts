// ==========================================================================
// Quiz Player Service — quizPlayer.service.ts
//
// Student-facing API. Orchestration + data retrieval functions.
// Delegates attempt/submission to quizAttemptService.ts and
// timer/helpers to quizTimerService.ts.
// ==========================================================================
import { db } from "@/services/db";
import { logger } from "@/utils/logger";

import type {
  QuestionType,
  QuizAttempt,
  QuizAttemptQuestion,
  StudentQuizAssignment,
} from "../types/quizzes.types";

interface QuizQuestionRow {
  id: string;
  text: string | null;
  explanation: string | null;
  order: number | null;
  question_type: QuestionType | null;
  points: number | null;
}

interface QuizOptionRow {
  id: string;
  question_id: string;
  text: string;
}

interface QuizAssignmentRow {
  id: string;
  quiz_id: string;
  class_id: string;
  status: string;
  available_from: string | null;
  due_at: string | null;
  max_attempts: number | null;
}

interface QuizRow {
  id: string;
  title: string | null;
  instructions: string | null;
  mode: string | null;
  time_limit_minutes: number | null;
  max_attempts: number | null;
  passing_score: number | null;
  show_correct_answers: boolean | null;
  status: string | null;
  available_from: string | null;
  available_until: string | null;
}

// Re-export everything from submodules for backward compatibility
export {
  batchSaveAnswers,
  startQuizAttempt,
  submitQuizAttempt,
} from "./quizAttemptService";
export {
  getCurrentQuestionIndex,
  recordCheatingSignal,
  recordHeartbeat,
} from "./quizTimerService";

/**
 * Get all questions for an attempt with current answers
 */
export async function getAttemptQuestions(
  attemptId: string,
): Promise<QuizAttemptQuestion[]> {
  // QUIZ-CRIT-01/02: Auth check — verify the user owns this attempt
  const {
    data: { session },
  } = await db.auth.getSession();
  if (!session?.user) throw new Error("Tidak terautentikasi");

  // Get the question manifest from the attempt, scoped to the authenticated student
  const { data: attempt, error: attemptError } = await db
    .from<any>("quiz_attempts_v2")
    .select("question_manifest, student_id, tenant_id")
    .eq("id", attemptId)
    .eq("student_id", session.user.id) // CRITICAL: ensure user owns this attempt
    .single();

  if (attemptError) throw attemptError;

  // Get all existing answers for this attempt
  const { data: answers, error: answersError } = await db
    .from<any>("quiz_attempt_questions_v2")
    .select(
      "attempt_id, question_id, student_answers, points_earned, is_correct",
    )
    .eq("attempt_id", attemptId);

  if (answersError) throw answersError;

  const manifest = (attempt.question_manifest as string[]) || [];
  if (manifest.length === 0) return [];

  // Fetch all questions in the manifest, scoped to the attempt's tenant
  const { data: questions, error: questionError } = await db
    .from<any>("quiz_questions")
    .select('id, text, explanation, "order", question_type, points')
    .in("id", manifest)
    .eq("tenant_id", attempt.tenant_id); // CRITICAL: tenant isolation

  if (questionError) throw questionError;

  const safeQuestions = questions as QuizQuestionRow[] | null;
  const questionIds = (safeQuestions ?? []).map((question) => question.id);
  const { data: options, error: optionError } =
    questionIds.length > 0
      ? await db
          .from<any>("quiz_options")
          .select("id, question_id, text")
          .eq("tenant_id", attempt.tenant_id)
          .in("question_id", questionIds)
      : { data: [], error: null };

  if (optionError) throw optionError;

  // Build Maps for O(1) lookup instead of O(n) find() - fixes O(n^2) performance
  const questionsMap = new Map<string, QuizQuestionRow>();
  ((questions ?? []) as QuizQuestionRow[]).forEach((q) =>
    questionsMap.set(q.id, q),
  );

  const optionsMap = new Map<string, QuizOptionRow[]>();
  ((options ?? []) as QuizOptionRow[]).forEach((option) => {
    const existing = optionsMap.get(option.question_id) ?? [];
    existing.push(option);
    optionsMap.set(option.question_id, existing);
  });

  const answersMap = new Map<string, (typeof answers)[0]>();
  (answers ?? []).forEach((a: any) => answersMap.set(a.question_id, a));

  // Map and normalize the data
  return manifest.map((questionId: string, index: number) => {
    const question = questionsMap.get(questionId);
    const answer = answersMap.get(questionId);

    let selectedOptionIds: string[] = [];
    let textAnswer: string | null = null;

    if (answer?.student_answers) {
      if (Array.isArray(answer.student_answers)) {
        selectedOptionIds = answer.student_answers as string[];
      } else if (typeof answer.student_answers === "string") {
        textAnswer = answer.student_answers;
      }
    }

    // Normalize quiz_options for the UI
    const normalizedOptions = (optionsMap.get(questionId) ?? []).map(
      (
        option: { id: string; text: string; order?: number },
        optionIndex: number,
      ) => ({
        id: option.id,
        text: option.text,
        order: option.order || optionIndex,
      }),
    );

    return {
      id: answer?.attempt_id
        ? `${answer.attempt_id}-${questionId}`
        : `${attemptId}-${questionId}`,
      question_id: questionId,
      text: question?.text || "",
      explanation: question?.explanation || null,
      order_index: index,
      question_type: (question?.question_type as QuestionType) || "MCQ",
      max_points: question?.points || 0,
      selected_option_id:
        selectedOptionIds.length === 1 ? selectedOptionIds[0] : null,
      selected_option_ids: selectedOptionIds,
      text_answer: textAnswer,
      points_earned: answer?.points_earned || null,
      is_correct: answer?.is_correct ?? null,
      grader_comment: null,
      graded_by: null,
      graded_at: null,
      quiz_options: normalizedOptions,
      question_snapshot: {
        question_id: questionId,
        text: question?.text || "",
        question_type: (question?.question_type as QuestionType) || "MCQ",
        points: question?.points || 0,
        explanation: question?.explanation || null,
        options: normalizedOptions,
      },
    } satisfies QuizAttemptQuestion;
  });
}

/**
 * Get all quiz assignments for the current student
 */
export async function getStudentQuizAssignments(
  tenantId: string,
): Promise<StudentQuizAssignment[]> {
  const {
    data: { session },
  } = await db.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  // Get student's enrolled classes
  const { data: enrollments, error: enrollmentError } = await db
    .from<Array<{ id: string; class_id: string; student_id: string; status: string; joined_at: string }>>("enrollments")
    .select("class_id")
    .eq("student_id", session.user.id)
    .eq("tenant_id", tenantId)
    .eq("status", "ACTIVE");

  if (enrollmentError) throw enrollmentError;

  // ⚡ Perf: consolidate multiple array traversals into a single pass to reduce O(N) operations.
  const classIds: string[] = [];
  const _enrollments = enrollments || [];
  for (let i = 0; i < _enrollments.length; i++) {
    const cid = _enrollments[i].class_id;
    if (cid) classIds.push(cid);
  }

  if (classIds.length === 0) return [];

  // Get quiz assignments for those classes
  const { data, error } = await db
    .from<any>("quiz_assignments")
    .select(
      "id, quiz_id, class_id, status, available_from, due_at, max_attempts",
    )
    .eq("tenant_id", tenantId)
    .in("class_id", classIds)
    .eq("status", "active")
    .order("available_from", { ascending: true })
    .limit(100);

  if (error) throw error;

  const assignmentRows = (data ?? []) as QuizAssignmentRow[];
  const assignedQuizIds = assignmentRows.map(
    (assignment) => assignment.quiz_id,
  );
  const assignedClassIds = assignmentRows.map(
    (assignment) => assignment.class_id,
  );

  const [
    { data: quizzes, error: quizError },
    { data: classes, error: classError },
  ] = await Promise.all([
    assignedQuizIds.length > 0
      ? db
          .from<any>("quizzes")
          .select(
            "id, title, instructions, mode, time_limit_minutes, max_attempts, passing_score, show_correct_answers, status, available_from, available_until",
          )
          .eq("tenant_id", tenantId)
          .eq("status", "published")
          .in("id", assignedQuizIds)
      : Promise.resolve({ data: [], error: null }),
    assignedClassIds.length > 0
      ? db
          .from<any>("classes")
          .select("id, name")
          .eq("tenant_id", tenantId)
          .in("id", assignedClassIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (quizError) throw quizError;
  if (classError) throw classError;

  const publishedQuizIds = new Set(
    ((quizzes ?? []) as QuizRow[]).map((quiz) => quiz.id),
  );
  const questionCounts = new Map<string, Array<{ id: string }>>();

  if (publishedQuizIds.size > 0) {
    const { data: quizQuestions, error: quizQuestionError } = await db
      .from<any>("quiz_questions")
      .select("id, quiz_id")
      .eq("tenant_id", tenantId)
      .in("quiz_id", Array.from(publishedQuizIds));

    if (quizQuestionError) throw quizQuestionError;
    ((quizQuestions ?? []) as Array<{ id: string; quiz_id: string }>).forEach(
      (question) => {
        const existing = questionCounts.get(question.quiz_id) ?? [];
        existing.push({ id: question.id });
        questionCounts.set(question.quiz_id, existing);
      },
    );
  }

  const quizMap = new Map(
    ((quizzes ?? []) as QuizRow[]).map((quiz) => [quiz.id, quiz]),
  );
  const classMap = new Map(
    ((classes ?? []) as Array<{ id: string; name: string }>).map((klass) => [
      klass.id,
      klass,
    ]),
  );

  return assignmentRows
    .filter((assignment) => publishedQuizIds.has(assignment.quiz_id))
    .map((assignment) => {
      const quiz = quizMap.get(assignment.quiz_id);
      const cls = classMap.get(assignment.class_id);
      return {
        id: assignment.id,
        assignment_id: assignment.id,
        quiz_id: assignment.quiz_id,
        class_id: assignment.class_id,
        class_name: cls?.name || "Kelas",
        title: quiz?.title || "Kuis",
        instructions: quiz?.instructions || null,
        mode: quiz?.mode || "graded",
        status: assignment.status,
        available_from:
          assignment.available_from ?? quiz?.available_from ?? null,
        due_at: assignment.due_at ?? quiz?.available_until ?? null,
        time_limit_minutes: quiz?.time_limit_minutes ?? null,
        max_attempts:
          (assignment as unknown as { max_attempts?: number }).max_attempts ??
          quiz?.max_attempts ??
          null,
        passing_score: quiz?.passing_score ?? null,
        show_correct_answers: quiz?.show_correct_answers ?? false,
        quiz_questions: questionCounts.get(assignment.quiz_id) || [],
        quizzes: quiz ?? null,
        classes: cls,
      };
    }) as unknown as StudentQuizAssignment[];
}

/**
 * Get all attempts for the current user
 */
export async function getUserAttempts(
  tenantId: string,
): Promise<QuizAttempt[]> {
  const {
    data: { session },
  } = await db.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  // NOTE: Nested joins (quizzes, quiz_assignments) removed — FK relationships
  // may not be registered in PostgREST schema cache on all environments,
  // causing a 400 error. Fetch only flat columns to maximise compatibility.
  const { data, error } = await db
    .from<any>("quiz_attempts_v2")
    .select(
      `
      id,
      quiz_id,
      student_id,
      status,
      score,
      started_at,
      submitted_at,
      time_spent,
      tenant_id,
      assignment_id
    `,
    )
    .eq("student_id", session.user.id)
    .eq("tenant_id", tenantId)
    .order("started_at", { ascending: false })
    .limit(100);

  if (error) {
    // PGRST200 = PostgREST relationship not in schema cache (FK not registered).
    // 42P01 = table/view does not exist.
    // 42703 = column does not exist.
    // These are schema-compatibility issues — degrade gracefully with an empty list.
    if (
      error.code === "PGRST200" ||
      error.code === "42P01" ||
      error.code === "42703"
    ) {
      if (import.meta.env.DEV)
        logger.warn(
          "[getUserAttempts] schema compat error — returning empty:",
          error.message,
        );
      return [];
    }
    // All other errors (auth, permissions, network) should surface to the caller.
    if (import.meta.env.DEV)
      logger.error("[getUserAttempts] query error:", error.message);
    throw error;
  }
  return (data || []) as unknown as QuizAttempt[];
}
