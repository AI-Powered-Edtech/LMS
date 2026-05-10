/**
 * autoGrader.ts — Client-side grading utility
 *
 * Pure functions for preview/validation grading.
 * Actual grading happens server-side via v1_submit_quiz_attempt RPC.
 *
 * Supports: MCQ, MULTIPLE_SELECT, TRUE_FALSE, SHORT_ANSWER
 * (ESSAY requires manual grading and is always scored 0 here.)
 */

// ─── Types ───────────────────────────────────────────────

export type GradeableQuestionType =
  | "MCQ"
  | "TRUE_FALSE"
  | "MULTIPLE_SELECT"
  | "SHORT_ANSWER"
  | "ESSAY";

export interface GradeableQuestion {
  id: string;
  question_type: GradeableQuestionType;
  points: number;
  /** Correct option IDs for MCQ/TRUE_FALSE/MULTIPLE_SELECT */
  correct_option_ids: string[];
  /** Accepted answer text for SHORT_ANSWER (case-insensitive match) */
  accepted_answers?: string[];
}

export interface StudentAnswer {
  question_id: string;
  selected_option_ids: string[];
  text_answer?: string | null;
}

export interface GradeResult {
  question_id: string;
  is_correct: boolean;
  points_earned: number;
  max_points: number;
  /** For MULTIPLE_SELECT: ratio of correct selections */
  partial_credit_ratio?: number;
}

// ─── Core Grading ────────────────────────────────────────

/**
 * Grade a single answer against the question definition.
 */
export function gradeAnswer(
  question: GradeableQuestion,
  answer: StudentAnswer | undefined,
): GradeResult {
  const base: GradeResult = {
    question_id: question.id,
    is_correct: false,
    points_earned: 0,
    max_points: question.points,
  };

  // No answer submitted
  if (!answer) return base;

  switch (question.question_type) {
    case "MCQ":
    case "TRUE_FALSE":
      return gradeSingleSelect(question, answer);

    case "MULTIPLE_SELECT":
      return gradeMultipleSelect(question, answer);

    case "SHORT_ANSWER":
      return gradeShortAnswer(question, answer);

    case "ESSAY":
      // Essay requires manual grading — always returns 0 in client preview
      return { ...base, is_correct: false, points_earned: 0 };

    default:
      return base;
  }
}

/**
 * Grade all answers for a quiz attempt.
 * Returns individual results + aggregate score.
 */
export function gradeAttempt(
  questions: GradeableQuestion[],
  answers: Record<string, StudentAnswer>,
): {
  results: GradeResult[];
  totalScore: number;
  maxScore: number;
  percentage: number;
} {
  const results = questions.map((q) => gradeAnswer(q, answers[q.id]));
  const totalScore = results.reduce((sum, r) => sum + r.points_earned, 0);
  const maxScore = results.reduce((sum, r) => sum + r.max_points, 0);
  const percentage =
    maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  return { results, totalScore, maxScore, percentage };
}

// ─── Question Type Graders ───────────────────────────────

function gradeSingleSelect(
  question: GradeableQuestion,
  answer: StudentAnswer,
): GradeResult {
  const selected = answer.selected_option_ids?.[0] ?? null;
  const correct = question.correct_option_ids?.[0] ?? null;

  const is_correct = selected !== null && selected === correct;

  return {
    question_id: question.id,
    is_correct,
    points_earned: is_correct ? question.points : 0,
    max_points: question.points,
  };
}

function gradeMultipleSelect(
  question: GradeableQuestion,
  answer: StudentAnswer,
): GradeResult {
  const selected = new Set(answer.selected_option_ids ?? []);
  const correct = new Set(question.correct_option_ids ?? []);

  if (correct.size === 0) {
    return {
      question_id: question.id,
      is_correct: selected.size === 0,
      points_earned: selected.size === 0 ? question.points : 0,
      max_points: question.points,
    };
  }

  // Count correct selections and incorrect selections
  let correctSelections = 0;
  let incorrectSelections = 0;

  for (const id of selected) {
    if (correct.has(id)) {
      correctSelections++;
    } else {
      incorrectSelections++;
    }
  }

  // Full credit only if exact match (all correct selected, no incorrect)
  const is_correct =
    correctSelections === correct.size && incorrectSelections === 0;

  // Partial credit: correct selections minus penalties for wrong selections
  const ratio = Math.max(
    0,
    (correctSelections - incorrectSelections) / correct.size,
  );
  const points_earned = is_correct
    ? question.points
    : Math.round(question.points * ratio * 100) / 100;

  return {
    question_id: question.id,
    is_correct,
    points_earned,
    max_points: question.points,
    partial_credit_ratio: ratio,
  };
}

function gradeShortAnswer(
  question: GradeableQuestion,
  answer: StudentAnswer,
): GradeResult {
  const studentText = (answer.text_answer ?? "").trim().toLowerCase();

  if (!studentText) {
    return {
      question_id: question.id,
      is_correct: false,
      points_earned: 0,
      max_points: question.points,
    };
  }

  const accepted = question.accepted_answers ?? [];
  const is_correct = accepted.some(
    (a) => a.trim().toLowerCase() === studentText,
  );

  return {
    question_id: question.id,
    is_correct,
    points_earned: is_correct ? question.points : 0,
    max_points: question.points,
  };
}
