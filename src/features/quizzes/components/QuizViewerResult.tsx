import { CheckCircle, Clock, FileText, XCircle } from "lucide-react";
import { motion } from "motion/react";

import type { QuizAttemptResult } from "@/features/quizzes";
import { cn } from "@/utils/cn";

interface QuizViewerResultProps {
  result: QuizAttemptResult;
  passingScore: number;
  maxAttempts: number;
  attemptNumber: number | null;
  hasAttemptsLeft: boolean;
  onRetry: () => void;
}

export function QuizViewerResult({
  result,
  passingScore,
  maxAttempts,
  attemptNumber,
  hasAttemptsLeft,
  onRetry,
}: QuizViewerResultProps) {
  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "rounded-2xl p-8 text-center border shadow-sm",
          result.has_ungraded
            ? "bg-amber-50 border-amber-200"
            : result.passed
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200",
        )}
      >
        <div
          className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
            result.has_ungraded
              ? "bg-amber-100"
              : result.passed
                ? "bg-green-100"
                : "bg-red-100",
          )}
        >
          {result.has_ungraded ? (
            <Clock className="w-8 h-8 text-amber-600" />
          ) : result.passed ? (
            <CheckCircle className="w-8 h-8 text-green-600" />
          ) : (
            <XCircle className="w-8 h-8 text-red-600" />
          )}
        </div>

        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          {result.has_ungraded
            ? "Jawaban Terkirim!"
            : result.passed
              ? "Selamat! Kuis Lulus!"
              : "Belum Lulus"}
        </h2>

        {result.has_ungraded ? (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-amber-700">
              <FileText className="w-4 h-4" />
              <span className="text-sm font-medium">
                Soal esai/jawaban singkat menunggu dinilai guru
              </span>
            </div>
            <div className="text-4xl font-bold text-amber-600 mt-2">
              {result.score}%
            </div>
            <p className="text-slate-500 text-xs mt-1">
              Skor sementara (soal otomatis)
            </p>
          </div>
        ) : (
          <>
            <div
              className="text-4xl font-bold mb-4"
              style={{ color: result.passed ? "#16a34a" : "#dc2626" }}
            >
              {result.score}%
            </div>
            <p className="text-slate-600 text-sm mb-6">
              {result.total_correct} dari {result.total_questions} jawaban benar
            </p>
          </>
        )}

        {!result.passed && !result.has_ungraded && (
          <div className="mt-3 space-y-1">
            {passingScore > 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Skor minimal untuk lulus:{" "}
                <span className="font-bold">{passingScore}%</span>
              </p>
            )}
            {hasAttemptsLeft && maxAttempts > 0 && (
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                Anda dapat mengulang kuis ini{" "}
                <span className="font-bold">
                  {maxAttempts - (attemptNumber ?? 1)}
                </span>{" "}
                kali lagi
              </p>
            )}
          </div>
        )}
        {!result.passed && !result.has_ungraded && hasAttemptsLeft && (
          <button
            onClick={onRetry}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors mt-4"
          >
            Coba Lagi
          </button>
        )}
        {!result.passed && !result.has_ungraded && !hasAttemptsLeft && (
          <p className="text-sm text-red-600 font-semibold mt-4">
            Batas percobaan tercapai (maks {maxAttempts}).
          </p>
        )}
      </motion.div>
    </div>
  );
}
