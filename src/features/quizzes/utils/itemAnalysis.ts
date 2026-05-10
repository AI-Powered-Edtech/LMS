/**
 * itemAnalysis.ts — Statistical utilities for quiz item analysis
 *
 * Implements classical test theory metrics:
 * - Difficulty Index (P): proportion of correct responses
 * - Discrimination Index (D): upper-lower group difference
 * - Point-Biserial Correlation (rpb): correlation between item & total score
 * - Quality classification based on P and D
 */

// ─── Types ───────────────────────────────────────────────

export type QuestionQuality =
  | "excellent"
  | "good"
  | "fair"
  | "poor"
  | "discard";

export interface ItemAnalysisResult {
  question_id: string;
  difficulty: number;
  discrimination: number;
  quality: QuestionQuality;
}

// ─── Difficulty Index ────────────────────────────────────

/**
 * Compute difficulty index P = correct / total.
 * Returns value between 0.0 (nobody got it right) and 1.0 (everyone did).
 *
 * Ideal range: 0.3–0.7 for good discrimination.
 */
export function computeDifficultyIndex(
  correctCount: number,
  totalAttempts: number,
): number {
  if (totalAttempts <= 0) return 0;
  return Math.max(0, Math.min(1, correctCount / totalAttempts));
}

// ─── Discrimination Index ────────────────────────────────

/**
 * Compute discrimination index D using upper-lower 27% method.
 *
 * Sorts all scores, takes top 27% (upper group) and bottom 27% (lower group),
 * then D = (upper correct rate) - (lower correct rate).
 *
 * Returns value between -1.0 and 1.0.
 * D > 0.3: good discrimination
 * D 0.1–0.3: acceptable
 * D < 0.1: poor (question doesn't differentiate)
 * D < 0: negative discrimination (weaker students do better — indicates flawed question)
 *
 * @param upperGroupCorrectRate - proportion of upper group who answered correctly (0-1)
 * @param lowerGroupCorrectRate - proportion of lower group who answered correctly (0-1)
 */
export function computeDiscriminationIndex(
  upperGroupCorrectRate: number,
  lowerGroupCorrectRate: number,
): number {
  return Math.max(
    -1,
    Math.min(1, upperGroupCorrectRate - lowerGroupCorrectRate),
  );
}

/**
 * Compute discrimination index from raw score data.
 * Takes all student scores and splits into upper/lower 27% groups.
 *
 * @param studentScoresOnQuestion - Array of { totalScore, isCorrect } for each student
 */
export function computeDiscriminationFromScores(
  studentScoresOnQuestion: { totalScore: number; isCorrect: boolean }[],
): number {
  if (studentScoresOnQuestion.length < 4) return 0; // Need at least 4 students

  const sorted = [...studentScoresOnQuestion].sort(
    (a, b) => b.totalScore - a.totalScore,
  );

  const groupSize = Math.max(1, Math.ceil(sorted.length * 0.27));
  const upperGroup = sorted.slice(0, groupSize);
  const lowerGroup = sorted.slice(sorted.length - groupSize);

  const upperCorrectRate =
    upperGroup.filter((s) => s.isCorrect).length / upperGroup.length;
  const lowerCorrectRate =
    lowerGroup.filter((s) => s.isCorrect).length / lowerGroup.length;

  return computeDiscriminationIndex(upperCorrectRate, lowerCorrectRate);
}

// ─── Point-Biserial Correlation ──────────────────────────

/**
 * Compute point-biserial correlation coefficient (rpb).
 *
 * Measures correlation between a dichotomous variable (correct/incorrect)
 * and a continuous variable (total score).
 *
 * rpb = (M1 - M0) / Sx * sqrt(p * q)
 * where M1 = mean total score of correct group
 *       M0 = mean total score of incorrect group
 *       Sx = standard deviation of all total scores
 *       p  = proportion correct, q = 1 - p
 *
 * @param questionScores - Array of { isCorrect, totalScore }
 */
export function computePointBiserial(
  questionScores: { isCorrect: boolean; totalScore: number }[],
): number {
  if (questionScores.length < 2) return 0;

  const correctGroup = questionScores.filter((s) => s.isCorrect);
  const incorrectGroup = questionScores.filter((s) => !s.isCorrect);

  if (correctGroup.length === 0 || incorrectGroup.length === 0) return 0;

  const meanCorrect = mean(correctGroup.map((s) => s.totalScore));
  const meanIncorrect = mean(incorrectGroup.map((s) => s.totalScore));

  const allScores = questionScores.map((s) => s.totalScore);
  const sd = standardDeviation(allScores);

  if (sd === 0) return 0;

  const p = correctGroup.length / questionScores.length;
  const q = 1 - p;

  return ((meanCorrect - meanIncorrect) / sd) * Math.sqrt(p * q);
}

// ─── Quality Classification ─────────────────────────────

/**
 * Classify question quality based on difficulty and discrimination.
 *
 * Classification matrix:
 * - Excellent: D ≥ 0.3 and 0.3 ≤ P ≤ 0.7
 * - Good: D ≥ 0.2 and 0.2 ≤ P ≤ 0.8
 * - Fair: D ≥ 0.1
 * - Poor: D ≥ 0 and D < 0.1
 * - Discard: D < 0 (negative discrimination)
 */
export function classifyQuestionQuality(
  difficulty: number,
  discrimination: number,
): QuestionQuality {
  if (discrimination < 0) return "discard";
  if (discrimination < 0.1) return "poor";
  if (discrimination >= 0.3 && difficulty >= 0.3 && difficulty <= 0.7)
    return "excellent";
  if (discrimination >= 0.2 && difficulty >= 0.2 && difficulty <= 0.8)
    return "good";
  return "fair";
}

/**
 * Run full item analysis on a set of questions.
 *
 * @param questionsData - Map of questionId → array of { totalScore, isCorrect }
 */
export function analyzeQuestions(
  questionsData: Record<string, { totalScore: number; isCorrect: boolean }[]>,
): ItemAnalysisResult[] {
  return Object.entries(questionsData).map(([questionId, scores]) => {
    const correctCount = scores.filter((s) => s.isCorrect).length;
    const difficulty = computeDifficultyIndex(correctCount, scores.length);
    const discrimination = computeDiscriminationFromScores(scores);
    const quality = classifyQuestionQuality(difficulty, discrimination);

    return { question_id: questionId, difficulty, discrimination, quality };
  });
}

// ─── Helpers ─────────────────────────────────────────────

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const squareDiffs = values.map((v) => (v - m) ** 2);
  return Math.sqrt(squareDiffs.reduce((sum, d) => sum + d, 0) / values.length);
}
