import { useState, useEffect } from 'react';
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
  Loader2
} from 'lucide-react';
import { cn } from '@/src/utils/cn';
import { useStudentProgress } from '@/src/contexts/StudentProgressContext';
import { quizService, type QuizAttemptResult, type QuizAttempt } from '@/src/services/quizService';

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
  const { getRemedialContent } = useStudentProgress();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'available' | 'completed'>('available');

  // Quiz Data State
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Quiz Taking State
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [currentQuizId, setCurrentQuizId] = useState<string | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Results State
  const [showResults, setShowResults] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizAttemptResult | null>(null);
  const [totalXP, setTotalXP] = useState(100);

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        setIsLoading(true);
        const [fetchedQuizzes, fetchedAttempts] = await Promise.all([
          quizService.getAllQuizzes(),
          quizService.getUserAttempts()
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
  }, []);

  const filteredQuizzes = quizzes.filter((quiz) => {
    const matchesSearch = quiz.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || quiz.subject === selectedSubject || (!quiz.subject && selectedSubject === 'Umum');
    return matchesSearch && matchesSubject;
  });

  const subjects = [...new Set(quizzes.map((q) => q.subject || 'Umum'))];

  const handleStartQuiz = async (quizId: string) => {
    try {
      setIsStarting(true);
      await quizService.startQuizAttempt(quizId);
      setCurrentQuizId(quizId);
      setCurrentQuestionIdx(0);
      setAnswers({});
      setIsQuizActive(true);
      setShowResults(false);
    } catch (err) {
      console.error("Failed to start", err);
      alert("Gagal memulai kuis. Pastikan Anda sudah login.");
    } finally {
      setIsStarting(false);
    }
  };

  const handleAnswer = (questionId: string, answerId: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answerId }));
  };

  const handleSubmitQuiz = async () => {
    const quiz = quizzes.find(q => q.id === currentQuizId);
    if (!quiz) return;

    try {
      setIsSubmitting(true);
      const formattedAnswers = Object.entries(answers).map(([qId, optId]) => ({
        question_id: qId,
        option_id: optId,
      }));

      const result = await quizService.submitQuizAttempt(quiz.id, formattedAnswers);
      setQuizResult({
        ...result,
        passed: result.passed,
        score: result.score
      });

      const updatedAttempts = await quizService.getUserAttempts();
      setQuizAttempts(updatedAttempts || []);

      if (result.passed) {
        setTotalXP(prev => prev + 50); // Tambahan stat XP sekadar visual
      }

      setIsQuizActive(false);
      setShowResults(true);
    } catch (err) {
      console.error("Gagal mengirim kuis", err);
      alert("Gagal mengirim kuis. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    setCurrentQuestionIdx(i => i + 1);
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
    const question = currentQuiz.quiz_questions[currentQuestionIdx];
    const isLastQuestion = currentQuestionIdx === currentQuiz.quiz_questions.length - 1;
    const hasAnswer = answers[question.id] !== undefined;

    return (
      <QuizTakingView
        quiz={currentQuiz}
        question={question}
        currentQuestion={currentQuestionIdx}
        totalQuestions={currentQuiz.quiz_questions.length}
        answers={answers}
        isSubmitting={isSubmitting}
        onAnswer={(answerId: string) => handleAnswer(question.id, answerId)}
        onNext={handleNext}
        onPrevious={() => setCurrentQuestionIdx(i => i - 1)}
        onSubmit={handleSubmitQuiz}
        isLastQuestion={isLastQuestion}
        hasAnswer={hasAnswer}
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
          {filteredQuizzes.length > 0 ? filteredQuizzes.map((quiz) => (
            <QuizCard
              key={quiz.id}
              quiz={quiz}
              onStart={() => handleStartQuiz(quiz.id)}
              isStarting={isStarting && currentQuizId === quiz.id}
            />
          )) : (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-10 text-slate-500">
              Belum ada kuis yang tersedia.
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {quizAttempts.length > 0 ? quizAttempts.map((attempt) => (
            <QuizAttemptCard key={attempt.id} attempt={attempt} />
          )) : (
            <div className="text-center py-10 text-slate-500">
              Anda belum menyelesaikan kuis apapun.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function QuizCard({ quiz, onStart, isStarting }: { quiz: any; onStart: () => void; isStarting?: boolean }) {
  const timeLimitMin = quiz.time_limit_minutes || 0;
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden"
    >
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className={cn('inline-block px-2 py-1 rounded-md text-xs font-bold mb-3', getDifficultyColor(quiz.difficulty))}>
              {getDifficultyLabel(quiz.difficulty)}
            </span>
            <h3 className="text-lg font-bold text-slate-900 leading-tight">{quiz.title}</h3>
            <p className="text-sm text-slate-500 mt-1">{quiz.subject || 'Umum'} • {quiz.grade || 'Semua Kelas'}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0">
            <Target className="w-5 h-5 text-white" />
          </div>
        </div>

        <p className="text-sm text-slate-600 mb-6 line-clamp-2 flex-1">{quiz.description}</p>

        <div className="flex items-center gap-4 text-sm font-medium text-slate-500 mb-6">
          <div className="flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4" />
            <span>{quiz.quiz_questions?.length || 0} soal</span>
          </div>
          {timeLimitMin > 0 && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{timeLimitMin} m</span>
            </div>
          )}
        </div>

        <button onClick={onStart} disabled={isStarting} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
          {isStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
          {isStarting ? 'Memulai...' : 'Mulai Kuis'}
        </button>
      </div>
    </motion.div>
  );
}

function QuizAttemptCard({ attempt }: { attempt: any }) {
  const quizTitle = attempt.quizzes?.title || 'Kuis Tidak Diketahui';
  const passed = attempt.passed;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
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
      <div className="text-right">
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
    </div>
  );
}

function QuizTakingView({
  quiz,
  question,
  currentQuestion,
  totalQuestions,
  answers,
  onAnswer,
  onNext,
  onPrevious,
  onSubmit,
  isLastQuestion,
  hasAnswer,
  isSubmitting
}: any) {
  const [timeLeft, setTimeLeft] = useState((quiz.time_limit_minutes || 10) * 60); // default 10 mnt in seconds

  useEffect(() => {
    if (timeLeft <= 0) {
      onSubmit();
      return;
    }
    const timer = setInterval(() => setTimeLeft((t: number) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, onSubmit]);

  const formattedTime = `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`;
  const isCritical = timeLeft < 60;
  const progress = ((currentQuestion + 1) / totalQuestions) * 100;

  return (
    <div className="max-w-3xl mx-auto space-y-6 flex-1 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">{quiz.title}</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Soal {currentQuestion + 1} dari {totalQuestions}
          </p>
        </div>
        <div className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-xl border',
          isCritical ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' : 'bg-white border-slate-200 text-slate-700'
        )}>
          <Timer className="w-5 h-5" />
          <span className="font-mono text-lg font-bold">{formattedTime}</span>
        </div>
      </div>

      {/* Progress */}
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8">
        <h3 className="text-xl font-medium text-slate-900 mb-8 leading-relaxed">{question.text}</h3>

        <div className="space-y-3">
          {question.quiz_options?.map((option: any) => {
            const isSelected = answers[question.id] === option.id;
            return (
              <button
                key={option.id}
                onClick={() => onAnswer(option.id)}
                className={cn(
                  'w-full flex items-center space-x-4 p-4 rounded-2xl border-2 text-left transition-all',
                  isSelected
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50 text-slate-700'
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0",
                  isSelected ? "border-blue-500" : "border-slate-300"
                )}>
                  {isSelected && <div className="w-3 h-3 bg-blue-500 rounded-full" />}
                </div>
                <span className="font-medium text-base">{option.text}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={onPrevious}
          disabled={currentQuestion === 0}
          className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-50 disabled:hover:bg-transparent flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Sebelumnya
        </button>

        <div className="flex gap-2 hidden md:flex">
          {Array.from({ length: totalQuestions }).map((_, index) => (
            <div
              key={index}
              className={cn(
                'w-2.5 h-2.5 rounded-full transition-colors',
                index === currentQuestion && 'bg-blue-500',
                index < currentQuestion && 'bg-blue-200',
                index > currentQuestion && 'bg-slate-200'
              )}
            />
          ))}
        </div>

        {isLastQuestion ? (
          <button
            onClick={onSubmit}
            disabled={!hasAnswer || isSubmitting}
            className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {isSubmitting ? 'Menyimpan...' : 'Selesai'}
          </button>
        ) : (
          <button
            onClick={onNext}
            disabled={!hasAnswer}
            className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 transition-colors"
          >
            Selanjutnya
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
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
