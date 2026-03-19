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
}) {
  const passed = result.passed;
  const isPendingGrade = passed === null;
  const score = result.score || 0;
  const [showConfetti, setShowConfetti] = useState(false);

  // Determine badge based on score
  const getBadge = () => {
    if (score >= 90) return { label: 'Excellent', icon: Star, color: 'bg-gradient-to-r from-amber-400 to-yellow-500', textColor: 'text-amber-900' };
    if (score >= 70) return { label: 'Good', icon: Award, color: 'bg-gradient-to-r from-blue-400 to-cyan-500', textColor: 'text-blue-900' };
    return { label: 'Needs Improvement', icon: ThumbsUp, color: 'bg-gradient-to-r from-slate-400 to-slate-500', textColor: 'text-slate-900' };
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
        "bg-white rounded-3xl border shadow-xl p-8 md:p-12 text-center w-full relative overflow-hidden",
        passed === true ? "border-green-200" : isPendingGrade ? "border-amber-200" : "border-red-200"
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
            passed === true ? 'bg-green-100' : isPendingGrade ? 'bg-amber-100' : 'bg-red-100'
          )}
        >
          {passed === true ? (
            <Trophy className="w-12 h-12 text-green-600" />
          ) : isPendingGrade ? (
            <Clock className="w-12 h-12 text-amber-600" />
          ) : (
            <XCircle className="w-12 h-12 text-red-600" />
          )}
        </motion.div>

        <h2 className="text-3xl font-black text-slate-900 mb-2">
          {passed === true ? 'Selamat!' : isPendingGrade ? 'Menunggu Penilaian' : 'Jangan Menyerah!'}
        </h2>
        <p className="text-slate-500 font-medium mb-8">
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
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-4xl font-black text-slate-800">{score}%</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Nilai</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-4xl font-black text-slate-800">{result.correct_answers}/{result.total_questions}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Benar</p>
          </div>
          {/* Points Display */}
          {passed === true && (
            <div className="col-span-2 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-100">
              <p className="text-3xl font-black text-green-700">+{result.score}</p>
              <p className="text-xs font-bold text-green-600 uppercase tracking-wider mt-1">Poin Diperoleh</p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
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
              className="px-6 py-3 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 flex items-center justify-center gap-2 transition-colors"
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
