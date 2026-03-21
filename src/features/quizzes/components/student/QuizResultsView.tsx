import { lazy, Suspense, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trophy, Clock, XCircle, Play, Eye, Star, Award, ThumbsUp } from 'lucide-react';
import { cn } from '@/src/utils/cn';

// Lazy-loaded Confetti component
const Confetti = lazy(() => import('./Confetti').then(module => ({ default: module.Confetti })));

export function QuizResultsView({
  result,
  quiz,
  onRetry,
  onClose,
  onViewAnswers,
  passingScore,
  maxAttempts,
  attemptsUsed,
}: {
  result: {
    score: number;
    passed: boolean | null;
    correct_answers: number;
    total_questions: number;
    show_correct_answers?: boolean;
    feedback?: string;
  };
  quiz?: {
    show_correct_answers?: boolean;
  };
  onRetry?: () => void;
  onClose?: () => void;
  onViewAnswers?: () => void;
  passingScore?: number;
  maxAttempts?: number;
  attemptsUsed?: number;
}) {
  const passed = result.passed;
  const isPendingGrade = passed === null;
  const score = result.score || 0;
  const [showConfetti, setShowConfetti] = useState(false);

  // Determine badge based on score
  const getBadge = () => {
    if (score >= 90) return { label: 'Sangat Baik', icon: Star, color: 'bg-gradient-to-r from-amber-400 to-yellow-500', textColor: 'text-amber-900' };
    if (score >= 70) return { label: 'Baik', icon: Award, color: 'bg-gradient-to-r from-blue-400 to-cyan-500', textColor: 'text-blue-900' };
    return { label: 'Perlu Ditingkatkan', icon: ThumbsUp, color: 'bg-gradient-to-r from-slate-400 to-slate-500', textColor: 'text-slate-900' };
  };

  const badge = getBadge();
  const BadgeIcon = badge.icon;

  // Trigger confetti on pass
  useEffect(() => {
    if (passed === true) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [passed]);

  const showCorrectAnswers = result.show_correct_answers || quiz?.show_correct_answers;

  return (
    <div className="max-w-2xl mx-auto flex-1 w-full flex items-center justify-center">
      {/* Lazy-loaded Confetti */}
      {showConfetti && (
        <Suspense fallback={null}>
          <Confetti />
        </Suspense>
      )}

      <div className={cn(
        "bg-white dark:bg-slate-800 rounded-3xl border shadow-xl p-8 md:p-12 text-center w-full relative overflow-hidden",
        passed === true
          ? "border-green-200 dark:border-green-800/50"
          : isPendingGrade
            ? "border-amber-200 dark:border-amber-800/50"
            : "border-red-200 dark:border-red-800/50"
      )}>
        {/* Gradient accent header */}
        <div className={cn(
          "absolute top-0 left-0 right-0 h-2",
          passed === true ? "bg-gradient-to-r from-green-400 via-emerald-500 to-teal-400" :
          isPendingGrade ? "bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-400" :
          "bg-gradient-to-r from-red-400 via-rose-500 to-pink-400"
        )} />

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 10 }}
          className={cn(
            'w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6',
            passed === true
              ? 'bg-green-100 dark:bg-green-900/30'
              : isPendingGrade
                ? 'bg-amber-100 dark:bg-amber-900/30'
                : 'bg-red-100 dark:bg-red-900/30'
          )}
        >
          {passed === true ? (
            <Trophy className="w-12 h-12 text-green-600 dark:text-green-400" />
          ) : isPendingGrade ? (
            <Clock className="w-12 h-12 text-amber-600 dark:text-amber-400" />
          ) : (
            <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
          )}
        </motion.div>

        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
          {passed === true ? 'Selamat!' : isPendingGrade ? 'Menunggu Penilaian' : 'Jangan Menyerah!'}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">
          {passed === true
            ? 'Anda telah berhasil menyelesaikan kuis ini!'
            : isPendingGrade
            ? 'Jawaban Anda sudah dikirim. Nilai akhir akan muncul setelah penilaian selesai.'
            : 'Anda belum mencapai nilai minimum. Coba lagi!'}
        </p>

        {/* Badge Display */}
        {passed !== null && !isPendingGrade && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6",
              badge.color
            )}
          >
            <BadgeIcon className={cn("w-5 h-5", badge.textColor)} />
            <span className={cn("font-bold", badge.textColor)}>{badge.label}</span>
          </motion.div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-10 max-w-sm mx-auto">
          <div className={cn(
            "p-4 rounded-2xl border",
            passed === true
              ? "bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800/50"
              : passed === false
                ? "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/50"
                : "bg-slate-50 dark:bg-slate-700 border-slate-100 dark:border-slate-600"
          )}>
            <p className={cn(
              "text-4xl font-black",
              passed === true
                ? "text-green-700 dark:text-green-400"
                : passed === false
                  ? "text-red-700 dark:text-red-400"
                  : "text-slate-800 dark:text-slate-200"
            )}>{score}%</p>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">Nilai</p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-2xl border border-slate-100 dark:border-slate-600">
            <p className="text-4xl font-black text-slate-800 dark:text-slate-200">{result.correct_answers}/{result.total_questions}</p>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">Benar</p>
          </div>
          {/* Points Display */}
          {passed === true && (
            <div className="col-span-2 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-100 dark:border-green-800/50">
              <p className="text-3xl font-black text-green-700 dark:text-green-400">+{result.score}</p>
              <p className="text-xs font-bold text-green-600 dark:text-green-500 uppercase tracking-wider mt-1">Skor</p>
            </div>
          )}
        </div>

        {passed === false && (passingScore && passingScore > 0 || maxAttempts && maxAttempts > 0) ? (
          <div className="flex flex-col items-center gap-1 mb-6 text-sm text-slate-500 dark:text-slate-400">
            {passingScore && passingScore > 0 ? (
              <p>Skor minimal untuk lulus: <span className="font-bold text-slate-700 dark:text-slate-300">{passingScore}%</span></p>
            ) : null}
            {maxAttempts && maxAttempts > 0 ? (
              <p><span className="font-bold text-slate-700 dark:text-slate-300">{maxAttempts - (attemptsUsed ?? 0)}</span> percobaan tersisa</p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Kembali ke Daftar Kuis
          </button>
          {showCorrectAnswers && onViewAnswers && (
            <button
              onClick={onViewAnswers}
              className="px-6 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors"
            >
              <Eye className="w-4 h-4" />
              Lihat Jawaban
            </button>
          )}
          {passed === false && onRetry && (
            <button
              onClick={onRetry}
              className="px-6 py-3 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 flex items-center justify-center gap-2 transition-colors"
            >
              <Play className="w-4 h-4 fill-current" />
              Coba Lagi
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
