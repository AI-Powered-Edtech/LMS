import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MessageSquare,
  PenLine,
  Save,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import {
  AttemptDetailAnswer,
  quizAnalyticsService,
} from "@/features/quizzes/api/quizAnalyticsService";
import { gradeAttemptQuestion } from "@/features/quizzes/api/quizManager.service";
import { cn } from "@/utils/cn";
import { captureError } from "@/utils/sentry";

interface AttemptDetailModalProps {
  attemptId: string;
  studentName: string;
  score: number | null;
  passed: boolean | null;
  onClose: () => void;
  onGraded?: () => void;
}

/** Returns true if a question type requires manual grading */
function isEssayType(type: AttemptDetailAnswer["question_type"]): boolean {
  return type === "ESSAY" || type === "SHORT_ANSWER";
}

/** Determines if an essay/short-answer question still needs grading */
function needsGrading(answer: AttemptDetailAnswer): boolean {
  return isEssayType(answer.question_type) && answer.is_correct === null;
}

export function AttemptDetailModal({
  attemptId,
  studentName,
  score,
  passed,
  onClose,
  onGraded,
}: AttemptDetailModalProps) {
  const { tenantId } = useAuth();
  const [answers, setAnswers] = useState<AttemptDetailAnswer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Grading state keyed by question_id
  const [gradingScores, setGradingScores] = useState<Record<string, string>>(
    {},
  );
  const [gradingComments, setGradingComments] = useState<
    Record<string, string>
  >({});
  const [gradingSaving, setGradingSaving] = useState<Record<string, boolean>>(
    {},
  );
  const [gradingToast, setGradingToast] = useState<
    Record<string, { type: "success" | "error"; message: string }>
  >({});

  useEffect(() => {
    async function loadDetail() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await quizAnalyticsService.getAttemptDetail(attemptId);
        setAnswers(data);

        // Pre-fill grading inputs for already-graded essay questions
        const scores: Record<string, string> = {};
        const comments: Record<string, string> = {};
        for (const a of data) {
          if (isEssayType(a.question_type)) {
            scores[a.question_id] =
              a.points_earned != null ? String(a.points_earned) : "";
            comments[a.question_id] = a.grader_comment ?? "";
          }
        }
        setGradingScores(scores);
        setGradingComments(comments);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Gagal memuat detail jawaban",
        );
      } finally {
        setIsLoading(false);
      }
    }
    void loadDetail();
  }, [attemptId]);

  const correctCount = answers.filter((a) => a.is_correct).length;
  const ungradedCount = answers.filter(needsGrading).length;

  const handleGrade = async (answer: AttemptDetailAnswer) => {
    const scoreStr = gradingScores[answer.question_id] ?? "";
    const scoreVal = parseFloat(scoreStr);

    if (isNaN(scoreVal) || scoreVal < 0 || scoreVal > answer.max_points) {
      setGradingToast((prev) => ({
        ...prev,
        [answer.question_id]: {
          type: "error",
          message: `Nilai harus antara 0 dan ${answer.max_points}`,
        },
      }));
      return;
    }

    setGradingSaving((prev) => ({ ...prev, [answer.question_id]: true }));
    setGradingToast((prev) => {
      const next = { ...prev };
      delete next[answer.question_id];
      return next;
    });

    try {
      const isCorrect = scoreVal >= answer.max_points * 0.7;
      const comment = gradingComments[answer.question_id] || undefined;

      await gradeAttemptQuestion(
        attemptId,
        answer.question_id,
        tenantId!,
        scoreVal,
        isCorrect,
        comment,
      );

      // Update local state to reflect the grading
      setAnswers((prev) =>
        prev.map((a) =>
          a.question_id === answer.question_id
            ? {
                ...a,
                points_earned: scoreVal,
                is_correct: isCorrect,
                grader_comment: comment ?? null,
                graded_at: new Date().toISOString(),
              }
            : a,
        ),
      );

      setGradingToast((prev) => ({
        ...prev,
        [answer.question_id]: {
          type: "success",
          message: "Nilai berhasil disimpan",
        },
      }));

      onGraded?.();

      // Auto-dismiss success toast
      setTimeout(() => {
        setGradingToast((prev) => {
          const next = { ...prev };
          if (next[answer.question_id]?.type === "success") {
            delete next[answer.question_id];
          }
          return next;
        });
      }, 3000);
    } catch (err: unknown) {
      captureError(err, { context: "AttemptDetailModal.gradeAnswer" });
      setGradingToast((prev) => ({
        ...prev,
        [answer.question_id]: {
          type: "error",
          message: err instanceof Error ? err.message : "Gagal menyimpan nilai",
        },
      }));
    } finally {
      setGradingSaving((prev) => ({ ...prev, [answer.question_id]: false }));
    }
  };

  /** Determine the border color for a question card */
  function getCardStyle(answer: AttemptDetailAnswer) {
    if (isEssayType(answer.question_type)) {
      if (answer.is_correct === null) {
        // Ungraded essay
        return "bg-amber-50/50 border-amber-300";
      }
      return answer.is_correct
        ? "bg-emerald-50/50 border-emerald-200"
        : "bg-red-50/50 border-red-200";
    }
    return answer.is_correct
      ? "bg-emerald-50/50 border-emerald-200"
      : "bg-red-50/50 border-red-200";
  }

  /** Determine the status icon for a question */
  function getStatusIcon(answer: AttemptDetailAnswer) {
    if (isEssayType(answer.question_type) && answer.is_correct === null) {
      return <PenLine className="w-5 h-5 text-amber-500" />;
    }
    return answer.is_correct ? (
      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        role="presentation"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col mx-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                Detail Jawaban
              </h2>
              {ungradedCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                  <PenLine className="w-3 h-3" />
                  {ungradedCount} Perlu Dinilai
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-slate-500">{studentName}</span>
              <span className="text-xs text-slate-300">&#8226;</span>
              <span
                className={cn(
                  "text-sm font-bold",
                  passed
                    ? "text-emerald-600"
                    : passed === false
                      ? "text-red-600"
                      : "text-slate-400",
                )}
              >
                Skor: {score ?? "-"}
              </span>
              {passed !== null && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold",
                    passed
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700",
                  )}
                >
                  {passed ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <XCircle className="w-3 h-3" />
                  )}
                  {passed ? "Lulus" : "Tidak Lulus"}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Memuat jawaban...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-red-500 gap-2">
              <AlertTriangle className="w-8 h-8 opacity-50" />
              <p className="text-sm">{error}</p>
            </div>
          ) : answers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <p className="text-sm">
                Tidak ada data jawaban untuk percobaan ini.
              </p>
            </div>
          ) : (
            answers.map((answer, idx) => (
              <div
                key={answer.question_id}
                className={cn(
                  "p-4 rounded-xl border transition-colors",
                  getCardStyle(answer),
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">
                      <span className="text-slate-400 mr-1">{idx + 1}.</span>
                      {answer.question_text}
                    </p>
                    {needsGrading(answer) && (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 whitespace-nowrap">
                        Perlu Dinilai
                      </span>
                    )}
                  </div>
                  <span className="shrink-0">{getStatusIcon(answer)}</span>
                </div>

                <div className="space-y-1.5 text-sm">
                  {/* Student's answer */}
                  <div
                    className={cn(
                      "flex items-start gap-2 px-3 py-2 rounded-lg",
                      isEssayType(answer.question_type) &&
                        answer.is_correct === null
                        ? "bg-amber-100/70 text-amber-800"
                        : answer.is_correct
                          ? "bg-emerald-100/70 text-emerald-800"
                          : "bg-red-100/70 text-red-800",
                    )}
                  >
                    <span className="font-medium text-xs uppercase tracking-wide opacity-60 shrink-0 pt-0.5">
                      Jawaban Siswa:
                    </span>
                    <span className="font-semibold whitespace-pre-wrap">
                      {answer.selected_option_text ||
                        answer.text_answer ||
                        "Tidak menjawab"}
                    </span>
                  </div>

                  {/* Correct answer (only show if student got it wrong and it's an MCQ-like question) */}
                  {!answer.is_correct &&
                    answer.correct_option_text &&
                    !isEssayType(answer.question_type) && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-100/40 text-emerald-700">
                        <span className="font-medium text-xs uppercase tracking-wide opacity-60">
                          Jawaban Benar:
                        </span>
                        <span className="font-semibold">
                          {answer.correct_option_text}
                        </span>
                      </div>
                    )}

                  {/* Show grading result for already-graded essay questions */}
                  {isEssayType(answer.question_type) &&
                    answer.is_correct !== null && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100/70 text-slate-700">
                        <span className="font-medium text-xs uppercase tracking-wide opacity-60">
                          Nilai:
                        </span>
                        <span className="font-bold">
                          {answer.points_earned ?? 0} / {answer.max_points}
                        </span>
                      </div>
                    )}

                  {/* Show existing grader comment if present */}
                  {answer.grader_comment &&
                    !isEssayType(answer.question_type) && (
                      <div className="mt-2 p-3 bg-purple-50/50 border border-purple-100 rounded-lg">
                        <span className="font-bold text-xs uppercase tracking-wide text-purple-800 mb-1 block">
                          Komentar Penilai:
                        </span>
                        <p className="text-sm text-purple-900/80 leading-relaxed">
                          {answer.grader_comment}
                        </p>
                      </div>
                    )}

                  {/* Explanation */}
                  {answer.explanation && (
                    <div className="mt-3 p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                      <span className="font-bold text-xs uppercase tracking-wide text-blue-800 mb-1 block">
                        Penjelasan:
                      </span>
                      <p className="text-sm text-blue-900/80 leading-relaxed">
                        {answer.explanation}
                      </p>
                    </div>
                  )}

                  {/* Essay / Short Answer Grading Form */}
                  {isEssayType(answer.question_type) && (
                    <div className="mt-3 p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                        <PenLine className="w-4 h-4 text-slate-500" />
                        Penilaian Manual
                      </div>

                      {/* Score input */}
                      <div className="flex items-center gap-3">
                        <label
                          htmlFor={`score-input-${answer.question_id}`}
                          className="text-xs font-medium text-slate-500 uppercase tracking-wide shrink-0"
                        >
                          Nilai
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              id={`score-input-${answer.question_id}`}
                              aria-label={`Nilai untuk pertanyaan ${idx + 1}`}
                              type="number"
                              min={0}
                              max={answer.max_points}
                              step="0.5"
                              value={gradingScores[answer.question_id] ?? ""}
                              onChange={(e) =>
                                setGradingScores((prev) => ({
                                  ...prev,
                                  [answer.question_id]: e.target.value,
                                }))
                              }
                              placeholder="0"
                              className="w-20 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 outline-none normal-case tracking-normal"
                            />
                            <span className="text-sm text-slate-400 normal-case tracking-normal">
                              / {answer.max_points}
                            </span>
                          </div>
                        </label>
                      </div>

                      {/* Feedback textarea */}
                      <div>
                        <label
                          htmlFor={`feedback-${answer.question_id}`}
                          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5"
                        >
                          <MessageSquare className="w-3 h-3" />
                          Komentar
                          <textarea
                            id={`feedback-${answer.question_id}`}
                            aria-label={`Komentar untuk pertanyaan ${idx + 1}`}
                            value={gradingComments[answer.question_id] ?? ""}
                            onChange={(e) =>
                              setGradingComments((prev) => ({
                                ...prev,
                                [answer.question_id]: e.target.value,
                              }))
                            }
                            placeholder="Berikan komentar untuk siswa (opsional)..."
                            rows={2}
                            className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none normal-case tracking-normal"
                          />
                        </label>
                      </div>

                      {/* Toast message */}
                      {gradingToast[answer.question_id] && (
                        <div
                          className={cn(
                            "px-3 py-2 rounded-lg text-xs font-medium",
                            gradingToast[answer.question_id].type === "success"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-red-50 text-red-700 border border-red-200",
                          )}
                        >
                          {gradingToast[answer.question_id].message}
                        </div>
                      )}

                      {/* Save button */}
                      <button
                        onClick={() => handleGrade(answer)}
                        disabled={gradingSaving[answer.question_id]}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {gradingSaving[answer.question_id] ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Simpan Nilai
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {!isLoading && !error && answers.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-sm text-slate-500">
              {correctCount} dari {answers.length} soal benar
              {ungradedCount > 0 && (
                <span className="text-amber-600 ml-2">
                  ({ungradedCount} belum dinilai)
                </span>
              )}
            </span>
            <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  correctCount / answers.length >= 0.7
                    ? "bg-emerald-500"
                    : correctCount / answers.length >= 0.4
                      ? "bg-amber-500"
                      : "bg-red-500",
                )}
                style={{ width: `${(correctCount / answers.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
