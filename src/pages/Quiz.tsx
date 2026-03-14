import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  HelpCircle,
  Search,
  Clock,
  Target,
  Zap,
  Play,
  CheckCircle,
  XCircle,
  Trophy,
  ArrowRight,
  ArrowLeft,
  Timer,
  Sparkles,
  Loader2,
  AlertTriangle,
  X
} from 'lucide-react';
import { cn } from '@/src/utils/cn';
import { useStudentProgress } from '@/src/contexts/StudentProgressContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { quizService, type QuizAttemptResult, type QuizAttempt, type SubmitAnswer } from '@/src/services/quizService';
import { QuizPlayer } from './quiz/QuizPlayer';
import { AttemptDetailModal } from '@/src/components/AttemptDetailModal';

const getDifficultyColor = (diff: string | undefined) => {
  switch (diff) {
    case 'easy': return 'bg-green-100 text-green-700';
    case 'medium': return 'bg-yellow-100 text-yellow-700';
    case 'hard': return 'bg-red-100 text-red-700';
    default: return 'bg-slate-100 text-slate-700';
  }
};

const getDifficultyLabel = (diff: string | undefined) => {
  switch (diff) {
    case 'easy': return 'Mudah';
    case 'medium': return 'Sedang';
    case 'hard': return 'Sulit';
    default: return 'Umum';
  }
};

// --- COMPONENT ---

export function QuizModule() {
  const { tenantId } = useAuth();
  const { getRemedialContent } = useStudentProgress();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'available' | 'completed'>('available');

  // Quiz Data State
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Start Quiz Modal
  const [pendingQuiz, setPendingQuiz] = useState<any | null>(null);

  // Quiz Taking State
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [currentQuizId, setCurrentQuizId] = useState<string | null>(null);
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);
  const [attemptVersion, setAttemptVersion] = useState<number | undefined>(undefined);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [attemptQuestions, setAttemptQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, SubmitAnswer>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [showReview, setShowReview] = useState(false);

  // Results State
  const [showResults, setShowResults] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizAttemptResult | null>(null);
  const [totalXP, setTotalXP] = useState(100);

  // Review Mode State
  const [reviewAttempt, setReviewAttempt] = useState<{ attemptId: string; studentName: string; score: number | null; passed: boolean | null; } | null>(null);

  useEffect(() => {
    const fetchQuizzes = async () => {
      if (!tenantId) {
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        const [fetchedQuizzes, fetchedAttempts] = await Promise.all([
          quizService.getAllQuizzes(tenantId),
          quizService.getUserAttempts(tenantId)
        ]);
        setQuizzes(fetchedQuizzes || []);
        setQuizAttempts(fetchedAttempts || []);
      } catch (err) {
        console.error("Gagal memuat kuis:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuizzes();
  }, [tenantId]);

  const filteredQuizzes = quizzes.filter((quiz) => {
    // Filter to only show active quizzes (exclude drafts, include nulls for legacy)
    if (quiz.status === 'draft') return false;

    const matchesSearch = quiz.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || quiz.subject === selectedSubject || (!quiz.subject && selectedSubject === 'Umum');
    return matchesSearch && matchesSubject;
  });

  const subjects = [...new Set(quizzes.map((q) => q.subject || 'Umum'))];

  const handleStartQuiz = async (quizId: string) => {
    try {
      setIsStarting(true);
      const startData = await quizService.startQuizAttempt(quizId);
      
      setCurrentQuizId(quizId);
      setCurrentAttemptId(startData.attempt_id);
      setAttemptVersion(startData.version);
      setExpiresAt(startData.expires_at);
      
      // Always fetch attempt questions for the snapshot
      const questions = await quizService.getAttemptQuestions(startData.attempt_id);
      setAttemptQuestions(questions);

      if (startData.recovered) {
        const recoveredAnswers: Record<string, SubmitAnswer> = {};
        questions.forEach((q) => {
          if (q.selected_option_ids?.length > 0 || q.text_answer) {
            recoveredAnswers[q.question_id] = {
              question_id: q.question_id,
              selected_option_ids: q.selected_option_ids || [],
              text_answer: q.text_answer || undefined,
            };
          }
        });
        setAnswers(recoveredAnswers);
      } else {
        setAnswers({});
      }
      
      setShowReview(false);
      setIsQuizActive(true);
      setShowResults(false);
    } catch (err: any) {
      console.error("Failed to start", err);
      if (err.message?.includes("limit reached")) {
        alert(err.message);
      } else if (err.message?.includes("active attempt")) {
        alert("Anda memiliki kuis yang sedang berjalan. Silakan muat ulang halaman.");
        window.location.reload();
      } else {
        alert("Gagal memulai kuis. Silakan coba lagi nanti.");
      }
    } finally {
      setIsStarting(false);
    }
  };

  const handleResumeQuiz = async (attempt: QuizAttempt) => {
    try {
      setIsStarting(true);
      setCurrentQuizId(attempt.quiz_id);
      setCurrentAttemptId(attempt.id);
      setAttemptVersion(attempt.version);
      setExpiresAt(attempt.expires_at);
      
      const questions = await quizService.getAttemptQuestions(attempt.id);
      setAttemptQuestions(questions);

      // Check if already expired upon resuming
      if (attempt.expires_at && new Date(attempt.expires_at) < new Date()) {
          alert("Waktu habis! Kuis Anda telah ditandai sebagai kedaluwarsa dan akan disubmit otomatis.");
          
          const recoveredAnswers: Record<string, SubmitAnswer> = {};
          questions.forEach((q) => {
            if (q.selected_option_ids?.length > 0 || q.text_answer) {
              recoveredAnswers[q.question_id] = {
                question_id: q.question_id,
                selected_option_ids: q.selected_option_ids || [],
                text_answer: q.text_answer || undefined,
              };
            }
          });
          
          const formattedAnswers: SubmitAnswer[] = Object.entries(recoveredAnswers).map(([qId, ans]) => ({
            question_id: qId,
            selected_option_ids: ans.selected_option_ids || [],
            text_answer: ans.text_answer,
          }));
          
          const result = await quizService.submitQuizAttempt(attempt.id, formattedAnswers, attempt.version);
          setQuizResult(result);
          
          if (tenantId) {
             const updatedAttempts = await quizService.getUserAttempts(tenantId);
             setQuizAttempts(updatedAttempts || []);
          }
          
          setIsQuizActive(false);
          setShowResults(true);
          setPendingQuiz(null);
          return;
      }

      const recoveredAnswers: Record<string, SubmitAnswer> = {};
      questions.forEach((q) => {
        if (q.selected_option_ids?.length > 0 || q.text_answer) {
          recoveredAnswers[q.question_id] = {
            question_id: q.question_id,
            selected_option_ids: q.selected_option_ids || [],
            text_answer: q.text_answer || undefined,
          };
        }
      });
      setAnswers(recoveredAnswers);
      
      setShowReview(false);
      setIsQuizActive(true);
      setShowResults(false);
    } catch (err: any) {
      console.error("Failed to resume", err);
      alert("Gagal melanjutkan kuis.");
    } finally {
      setIsStarting(false);
    }
  };

  const handleAnswer = (questionId: string, answer: SubmitAnswer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmitQuiz = async () => {
    const currentTenantId = tenantId;
    const quiz = quizzes.find(q => q.id === currentQuizId);
    if (!quiz) return;

    try {
      setIsSubmitting(true);
      if (!currentAttemptId) throw new Error('No active attempt');

      const formattedAnswers: SubmitAnswer[] = Object.entries(answers).map(([qId, ans]) => ({
        question_id: qId,
        selected_option_ids: ans.selected_option_ids || [],
        text_answer: ans.text_answer,
      }));

      const result = await quizService.submitQuizAttempt(currentAttemptId, formattedAnswers, attemptVersion);
      setQuizResult(result);

      if (currentTenantId) {
        const updatedAttempts = await quizService.getUserAttempts(currentTenantId);
        setQuizAttempts(updatedAttempts || []);
      }

      if (result.passed) {
        setTotalXP(prev => prev + 50); // Tambahan stat XP sekadar visual
      }

      setIsQuizActive(false);
      setShowResults(true);
    } catch (err: any) {
      console.error("Gagal mengirim kuis", err);
      if (err.message?.includes("Time limit exceeded")) {
        alert("Waktu habis! Kuis Anda telah ditandai sebagai kedaluwarsa.");
        setIsQuizActive(false);
        if (tenantId) {
          quizService.getUserAttempts(tenantId).then(setQuizAttempts);
        }
      } else if (err.message?.includes("ATTEMPT_VERSION_CONFLICT")) {
          alert("Kuis ini baru saja disubmit dari tempat lain (tab/perangkat lain). Memuat ulang...");
          setIsQuizActive(false);
          if (tenantId) {
            quizService.getUserAttempts(tenantId).then(setQuizAttempts);
          }
      } else {
        alert("Gagal mengirim kuis. Silakan coba lagi.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQuiz = quizzes.find(q => q.id === currentQuizId);

  // Loading View
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Quiz Taking View
  if (isQuizActive && currentQuiz) {
    if (!attemptQuestions || attemptQuestions.length === 0) {
      return (
        <div className="flex-1 max-w-4xl w-full mx-auto px-6 py-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Kuis Belum Memiliki Soal</h3>
            <p className="text-slate-500 mb-6">Kuis ini belum memiliki soal yang dapat dikerjakan. Silakan hubungi pengajar Anda.</p>
            <button 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              onClick={() => { setIsQuizActive(false); setShowResults(false); }}
            >
              Kembali
            </button>
          </div>
        </div>
      );
    }

    return (
      <QuizPlayer
        attemptId={currentAttemptId}
        expiresAt={expiresAt}
        quiz={currentQuiz}
        attemptQuestions={attemptQuestions}
        answers={answers}
        isSubmitting={isSubmitting}
        onAnswer={handleAnswer}
        onSubmit={handleSubmitQuiz}
        showReview={showReview}
        setShowReview={setShowReview}
      />
    );
  }

  // Results View
  if (showResults && quizResult && currentQuiz) {
    return (
      <QuizResultsView
        result={quizResult}
        quiz={currentQuiz}
        onRetry={() => handleStartQuiz(currentQuiz.id)}
        onClose={() => {
          setShowResults(false);
          setCurrentQuizId(null);
        }}
      />
    );
  }

  return (
    <div className="flex-1 space-y-6">
      {/* Start Quiz Confirmation Modal */}
      <AnimatePresence>
        {pendingQuiz && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setPendingQuiz(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative"
            >
              <button
                onClick={() => setPendingQuiz(null)}
                className="absolute top-4 right-4 p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-6">
                <Play className="w-8 h-8 text-white fill-current" />
              </div>

              <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">
                {pendingQuiz.isResume ? 'Lanjutkan Kuis?' : 'Mulai Kuis?'}
              </h2>
              <p className="text-slate-500 text-center mb-6">{pendingQuiz.title}</p>

              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-xl">
                  <span className="text-sm font-medium text-slate-500">Jumlah Soal</span>
                  <span className="font-bold text-slate-800">{pendingQuiz.quiz_questions?.length || 0} soal</span>
                </div>
                {(pendingQuiz.time_limit_minutes > 0) && (
                  <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-xl">
                    <span className="text-sm font-medium text-slate-500">Batas Waktu</span>
                    <span className="font-bold text-slate-800">{pendingQuiz.time_limit_minutes} menit</span>
                  </div>
                )}
                {pendingQuiz.max_attempts && (
                  <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-xl">
                    <span className="text-sm font-medium text-slate-500">Kesempatan</span>
                    <span className="font-bold text-slate-800">{pendingQuiz.max_attempts}× percobaan</span>
                  </div>
                )}
              </div>

              {pendingQuiz.isResume ? (
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100 mb-6">
                  <Clock className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-bold mb-1">Anda memiliki kuis yang masih berjalan.</p>
                    <p>Waktu yang tersisa akan dilanjutkan dari sisa waktu sebelumnya. Harap segera diselesaikan.</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100 mb-6">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-700">
                    <p className="font-bold mb-1">Peringatan Waktu!</p>
                    <p>Setelah Anda menekan tombol mulai, timer akan langsung berjalan. Waktu tidak dapat dihentikan sementara.</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setPendingQuiz(null)}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    const quiz = pendingQuiz;
                    setPendingQuiz(null);
                    if (quiz.isResume) {
                      handleResumeQuiz(quiz.activeAttempt);
                    } else {
                      handleStartQuiz(quiz.id);
                    }
                  }}
                  disabled={isStarting}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                  {isStarting ? (pendingQuiz.isResume ? 'Melanjutkan...' : 'Memulai...') : (pendingQuiz.isResume ? 'Lanjutkan Kuis' : 'Mulai Kuis')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Kuis & Evaluasi</h1>
          <p className="text-slate-500 mt-1">
            Uji pemahaman Anda dengan kuis interaktif
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
            <HelpCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-800">{quizzes.length}</p>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Kuis</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-800">{quizAttempts.length}</p>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Selesai</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-800">
              {quizAttempts.length > 0 ? Math.round(quizAttempts.reduce((acc, a) => acc + (a.score || 0), 0) / quizAttempts.length) : 0}%
            </p>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rata-rata</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-800">{totalXP}</p>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">XP Diterima</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kuis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
          >
            <option value="all">Semua Mapel</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('available')}
          className={cn("px-4 py-2 font-bold text-sm border-b-2 transition-colors", activeTab === 'available' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700")}
        >
          Tersedia
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={cn("px-4 py-2 font-bold text-sm border-b-2 transition-colors", activeTab === 'completed' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700")}
        >
          Selesai
        </button>
      </div>

      {/* Quiz List */}
      {activeTab === 'available' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQuizzes.length > 0 ? filteredQuizzes.map((quiz) => {
            const activeAttempt = quizAttempts.find(a => a.quiz_id === quiz.id && a.status === 'IN_PROGRESS');
            const attemptsCount = quizAttempts.filter(a => a.quiz_id === quiz.id).length;
            
            return (
              <QuizCard
                key={quiz.id}
                quiz={quiz}
                activeAttempt={activeAttempt}
                attemptsCount={attemptsCount}
                onStart={() => {
                  if (activeAttempt) {
                    setPendingQuiz({ ...quiz, isResume: true, activeAttempt });
                  } else {
                    setPendingQuiz({ ...quiz, isResume: false });
                  }
                }}
                isStarting={isStarting && currentQuizId === quiz.id}
              />
            );
          }) : (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-10 text-slate-500">
              Belum ada kuis yang tersedia.
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {quizAttempts.length > 0 ? quizAttempts.map((attempt) => (
            <QuizAttemptCard 
              key={attempt.id} 
              attempt={attempt} 
              onReview={() => setReviewAttempt({
                attemptId: attempt.id,
                studentName: 'Anda',
                score: attempt.score,
                passed: attempt.passed
              })}
            />
          )) : (
            <div className="text-center py-10 text-slate-500">
              Anda belum menyelesaikan kuis apapun.
            </div>
          )}
        </div>
      )}

      {/* Review Modal */}
      {reviewAttempt && (
        <AttemptDetailModal 
          attemptId={reviewAttempt.attemptId}
          studentName={reviewAttempt.studentName}
          score={reviewAttempt.score}
          passed={reviewAttempt.passed}
          onClose={() => setReviewAttempt(null)}
        />
      )}
    </div>
  );
}

function QuizCard({ quiz, activeAttempt, attemptsCount = 0, onStart, isStarting }: { quiz: any; activeAttempt?: any; attemptsCount?: number; onStart: () => void; isStarting?: boolean }) {
  const timeLimitMin = quiz.time_limit_minutes || 0;
  const maxAttempts = quiz.max_attempts;
  const isAvailable = attemptsCount < maxAttempts || !maxAttempts;
  const availableUntil = quiz.available_until ? new Date(quiz.available_until) : null;
  const isExpired = availableUntil ? availableUntil < new Date() : false;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden"
    >
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-2">
          <div className="flex gap-2 items-center">
            <span className={cn('inline-block px-2 py-1 rounded-md text-xs font-bold', getDifficultyColor(quiz.difficulty))}>
              {getDifficultyLabel(quiz.difficulty)}
            </span>
            {activeAttempt ? (
              <span className="inline-block px-2 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-700 uppercase tracking-wider">
                In Progress
              </span>
            ) : attemptsCount > 0 && !isAvailable ? (
              <span className="inline-block px-2 py-1 rounded-md text-xs font-bold bg-green-100 text-green-700 uppercase tracking-wider">
                Completed
              </span>
            ) : (
              <span className="inline-block px-2 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700 uppercase tracking-wider">
                Available
              </span>
            )}
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0">
            <Target className="w-5 h-5 text-white" />
          </div>
        </div>

        <h3 className="text-lg font-bold text-slate-900 leading-tight mb-1">{quiz.title}</h3>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-4">
           {quiz.subject && <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{quiz.subject}</span>}
           <span className="text-sm text-slate-500">{quiz.quiz_questions?.length || 0} Questions {timeLimitMin > 0 ? `• ${timeLimitMin} Minutes` : ''}</span>
        </div>
        
        {availableUntil && (
           <p className={cn("text-xs font-bold mb-3", isExpired ? "text-red-500" : "text-amber-600")}>
             Due: {availableUntil.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
             {' '}{availableUntil.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
           </p>
        )}

        <p className="text-sm text-slate-600 mb-6 line-clamp-2 flex-1">{quiz.description}</p>

        {activeAttempt && (
          <div className="mb-6 space-y-2">
            <div className="flex justify-between items-end">
              <span className="text-xs font-bold text-blue-600">Progress Pengerjaan</span>
              <span className="text-xs font-bold text-blue-400">Sedang Berjalan</span>
            </div>
            <div className="w-full bg-blue-50 rounded-full h-2 overflow-hidden">
               <div className="bg-blue-500 h-2 rounded-full w-[50%] animate-pulse"></div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 text-sm font-medium text-slate-500 mb-6">
          {maxAttempts > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-bold px-2 py-1 bg-slate-50 border border-slate-100 rounded-md">
              <span>Attempt: {Math.min(attemptsCount + (activeAttempt ? 0 : 1), maxAttempts)} / {maxAttempts}</span>
            </div>
          )}
        </div>

        <button 
          onClick={onStart} 
          disabled={isStarting || (!activeAttempt && !isAvailable)} 
          className={cn(
             "w-full font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50",
             activeAttempt ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-slate-900 hover:bg-slate-800 text-white"
          )}
        >
          {isStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
          {isStarting ? (activeAttempt ? 'Melanjutkan...' : 'Memulai...') : (activeAttempt ? 'Lanjutkan Kuis' : (!isAvailable ? 'Selesai' : 'Mulai Kuis'))}
        </button>
      </div>
    </motion.div>
  );
}

function QuizAttemptCard({ attempt, onReview }: { attempt: any; onReview: () => void }) {
  const quizTitle = attempt.quizzes?.title || 'Kuis Tidak Diketahui';
  const passed = attempt.passed;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center shrink-0',
            passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
          )}
        >
          {passed ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
        </div>
        <div>
          <h4 className="font-bold text-slate-900">{quizTitle}</h4>
          <p className="text-sm text-slate-500">
            {new Date(attempt.submitted_at).toLocaleDateString('id-ID')}
          </p>
        </div>
      </div>
      <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
        <div className="text-left md:text-right">
          <p className={cn(
            'text-2xl font-black tracking-tight',
            passed ? 'text-green-600' : 'text-red-600'
          )}>
            {attempt.score}%
          </p>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {passed ? 'Lulus' : 'Belum Lulus'}
          </p>
        </div>
        <button 
          onClick={onReview}
          className="md:mt-3 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-bold rounded-xl transition-colors shrink-0 whitespace-nowrap"
        >
          Review Answers
        </button>
      </div>
    </div>
  );
}



function QuizResultsView({
  result,
  quiz,
  onRetry,
  onClose,
}: any) {
  const passed = result.passed;

  return (
    <div className="max-w-2xl mx-auto flex-1 w-full flex items-center justify-center">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 md:p-12 text-center w-full">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 10 }}
          className={cn(
            'w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6',
            passed ? 'bg-green-100' : 'bg-red-100'
          )}
        >
          {passed ? (
            <Trophy className="w-12 h-12 text-green-600" />
          ) : (
            <XCircle className="w-12 h-12 text-red-600" />
          )}
        </motion.div>

        <h2 className="text-3xl font-black text-slate-900 mb-2">
          {passed ? 'Selamat!' : 'Jangan Menyerah!'}
        </h2>
        <p className="text-slate-500 font-medium mb-8">
          {passed
            ? 'Anda telah berhasil menyelesaikan kuis ini!'
            : 'Anda belum mencapai nilai minimum. Coba lagi!'}
        </p>

        <div className="grid grid-cols-2 gap-4 mb-10 max-w-sm mx-auto">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-4xl font-black text-slate-800">{result.score}%</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Nilai</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-4xl font-black text-slate-800">{result.correct_answers}/{result.total_questions}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Benar</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Kembali ke Daftar Kuis
          </button>
          {!passed && (
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
