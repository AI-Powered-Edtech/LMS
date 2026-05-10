import {
  AlertCircle,
  ClipboardList,
  Loader2,
  MessageSquare,
  Save,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

import { OptimizedImage } from "@/components/ui";
import type { RubricScore } from "@/features/rubrics";
import {
  RubricScoringGrid,
  useRubricByAssignment,
  useRubricScores,
  useScoreSubmission,
} from "@/features/rubrics";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/utils/cn";

import type { SpeedGraderStudent } from "./types";
import { QUICK_COMMENTS } from "./types";

interface RubricPanelProps {
  currentStudent: SpeedGraderStudent;
  feedback: string;
  totalScore: number;
  manualScore: number;
  effectiveScore: number;
  maxScore: number;
  latePenaltyPercent: number;
  isLoading: boolean;
  isAIGrading: boolean;
  // Dynamic rubric props
  submissionId: string | null;
  assignmentId: string | null;
  tenantId: string | null;
  onFeedbackChange: (feedback: string) => void;
  onManualScoreChange: (score: number) => void;
  onAIGrade: () => void;
  onSaveAndNext: (status: "graded" | "needs_revision") => void;
  /** Di mobile, action footer disembunyikan karena digantikan fixed bottom bar di halaman */
  isMobile?: boolean;
}

function StudentInfoHeader({
  student,
  earnedScore,
  effectiveScore,
  totalRubricPoints,
  hasRubric,
  maxScore,
  isLoading,
}: {
  student: SpeedGraderStudent;
  earnedScore: number;
  effectiveScore: number;
  totalRubricPoints: number;
  hasRubric: boolean;
  maxScore: number;
  isLoading: boolean;
}) {
  if (!student) return null;
  return (
    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center overflow-hidden border-2 border-white dark:border-slate-800 shadow-sm">
          <OptimizedImage
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student?.name || ""}`}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white">
            {student?.name}
          </h3>
          <span
            className={cn(
              "text-xs font-bold px-2 py-0.5 rounded-full",
              student.gradeEntry.status === "graded"
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                : student.gradeEntry.status === "needs_revision"
                  ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                  : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
            )}
          >
            {student.gradeEntry.status === "graded"
              ? "Sudah Dinilai"
              : student.gradeEntry.status === "needs_revision"
                ? "Perlu Revisi"
                : "Belum Dinilai"}
          </span>
        </div>
      </div>

      <div className="text-right">
        {isLoading ? (
          <div className="h-8 w-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse ml-auto mb-1" />
        ) : (
          <div className="text-3xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
            {hasRubric ? earnedScore : effectiveScore}
            {(hasRubric ? totalRubricPoints : maxScore) > 0 && (
              <span className="text-lg font-bold text-slate-400 dark:text-slate-500">
                /{hasRubric ? totalRubricPoints : maxScore}
              </span>
            )}
          </div>
        )}
        <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          {hasRubric ? "Nilai Rubrik" : "Nilai Efektif"}
        </div>
      </div>
    </div>
  );
}

function RubricSkeleton() {
  return (
    <div className="space-y-8">
      {[1, 2].map((i) => (
        <div key={i} className="space-y-3">
          <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
          <div className="grid gap-2 mt-4">
            <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function RubricPanel({
  currentStudent,
  feedback,
  manualScore,
  effectiveScore,
  maxScore,
  latePenaltyPercent,
  isLoading,
  isAIGrading,
  submissionId,
  assignmentId,
  tenantId,
  onFeedbackChange,
  onManualScoreChange,
  onAIGrade,
  onSaveAndNext,
  isMobile = false,
}: RubricPanelProps) {
  const addToast = useToast((s) => s.addToast);

  // Fetch rubric for this assignment
  const { data: rubric, isLoading: isRubricLoading } = useRubricByAssignment(
    assignmentId,
    tenantId,
  );

  // Fetch existing scores for this submission
  const { data: existingScores, isLoading: isScoresLoading } = useRubricScores(
    submissionId,
    tenantId,
  );

  // Local scores state — initialised from server data
  const [scores, setScores] = useState<RubricScore[]>([]);
  const [scoresInitialized, setScoresInitialized] = useState<string | null>(
    null,
  );

  // Re-init when submission changes
  if (submissionId && submissionId !== scoresInitialized && existingScores) {
    setScores(existingScores);
    setScoresInitialized(submissionId);
  }

  const scoreSubmission = useScoreSubmission();

  const isContentLoading = isLoading || isRubricLoading || isScoresLoading;

  const earnedScore = scores.reduce((sum, s) => sum + Number(s.score), 0);
  const totalRubricPoints = rubric?.total_points ?? 0;

  const addQuickComment = (comment: string) => {
    onFeedbackChange(feedback ? `${feedback}\n${comment}` : comment);
  };

  const handleSaveAndNext = async (status: "graded" | "needs_revision") => {
    // Persist rubric scores if we have a submission and rubric
    if (submissionId && rubric && scores.length > 0) {
      try {
        await scoreSubmission.mutateAsync({ submissionId, scores });
      } catch {
        addToast({ type: "error", message: "Gagal menyimpan skor rubrik." });
        return;
      }
    }
    onSaveAndNext(status);
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700 flex flex-col shrink-0 z-20 shadow-[-4px_0_24px_rgba(0,0,0,0.02)]">
      <StudentInfoHeader
        student={currentStudent}
        earnedScore={earnedScore}
        effectiveScore={effectiveScore}
        totalRubricPoints={totalRubricPoints}
        hasRubric={Boolean(rubric)}
        maxScore={maxScore}
        isLoading={isContentLoading}
      />

      {/* Rubric Scoring */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {isContentLoading ? (
          <RubricSkeleton />
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-800 dark:text-white">
                Rubrik Penilaian
              </h3>
              <button
                onClick={onAIGrade}
                disabled={isAIGrading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
              >
                {isAIGrading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                {isAIGrading ? "AI Menilai..." : "Auto-Grade AI"}
              </button>
            </div>

            {/* No rubric state */}
            {!rubric && (
              <div className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
                <div className="flex items-start gap-3">
                  <ClipboardList className="w-5 h-5 text-slate-400 dark:text-slate-500 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                      Penilaian manual
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Tugas ini belum memiliki rubrik. Masukkan nilai manual,
                      lalu sistem akan menghitung nilai efektif setelah penalti
                      keterlambatan.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <label className="space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Nilai Raw
                    </span>
                    <input
                      type="number"
                      min="0"
                      max={maxScore}
                      value={Number.isNaN(manualScore) ? 0 : manualScore}
                      onChange={(event) =>
                        onManualScoreChange(Number(event.target.value || 0))
                      }
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                  <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">
                        Nilai efektif
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {effectiveScore}/{maxScore}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-slate-500 dark:text-slate-400">
                        Penalti terlambat
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {latePenaltyPercent}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Rubric scoring grid */}
            {rubric && (
              <RubricScoringGrid
                rubric={rubric}
                scores={scores}
                onChange={setScores}
              />
            )}

            {/* General Feedback */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <h4 className="font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                Umpan Balik (Opsional)
              </h4>
              <textarea
                value={feedback ?? ""}
                onChange={(e) => onFeedbackChange(e.target.value)}
                placeholder="Berikan komentar tambahan untuk siswa..."
                className="w-full h-24 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 dark:text-white transition-all resize-none"
              />
              <div className="flex flex-wrap gap-2 mt-3">
                {QUICK_COMMENTS.map((comment, idx) => (
                  <button
                    key={idx}
                    onClick={() => addQuickComment(comment)}
                    className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-full transition-colors"
                  >
                    {comment}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Action Footer — disembunyikan di mobile karena ada fixed bottom bar di halaman */}
      {!isMobile && (
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-2">
          <button
            onClick={() => handleSaveAndNext("needs_revision")}
            disabled={isLoading || scoreSubmission.isPending}
            className="flex-1 py-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            <AlertCircle className="w-5 h-5" />
            Minta Revisi
          </button>
          <button
            onClick={() => handleSaveAndNext("graded")}
            disabled={isLoading || scoreSubmission.isPending}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm shadow-blue-200 dark:shadow-none active:scale-95 disabled:opacity-50"
          >
            {scoreSubmission.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Simpan &amp; Lanjut
          </button>
        </div>
      )}
    </div>
  );
}
