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
} from 'lucide-react';
import { cn } from '@/src/utils/cn';
import { useStudentProgress } from '@/src/contexts/StudentProgressContext';

// --- MOCK DATA & STORES ---

const quizzes = [
  {
    id: 'q1',
    title: 'Dasar-dasar AI',
    subject: 'Ilmu Komputer',
    grade: 'Kelas 10',
    difficulty: 'easy',
    description: 'Kuis pengenalan tentang Artificial Intelligence.',
    timeLimit: 300, // 5 minutes
    totalPoints: 100,
    passingScore: 70,
    questions: [
      {
        id: 'q1_1',
        type: 'multiple_choice',
        question: 'Apa kepanjangan dari AI?',
        options: ['Artificial Intelligence', 'Automated Information', 'Advanced Integration', 'Applied Intellect'],
        correctAnswer: 'Artificial Intelligence',
      },
      {
        id: 'q1_2',
        type: 'true_false',
        question: 'Machine Learning adalah bagian dari AI.',
        options: ['Benar', 'Salah'],
        correctAnswer: 'Benar',
      },
      {
        id: 'q1_3',
        type: 'multiple_choice',
        question: 'Bahasa pemrograman apa yang paling sering digunakan dalam AI?',
        options: ['Python', 'Java', 'C++', 'Ruby'],
        correctAnswer: 'Python',
      },
      {
        id: 'q1_4',
        type: 'multiple_choice',
        question: 'Apa itu Neural Network?',
        options: ['Jaringan saraf tiruan', 'Jaringan komputer', 'Sistem operasi', 'Bahasa pemrograman'],
        correctAnswer: 'Jaringan saraf tiruan',
      }
    ]
  },
  {
    id: 'q2',
    title: 'Machine Learning Dasar',
    subject: 'Ilmu Komputer',
    grade: 'Kelas 11',
    difficulty: 'medium',
    description: 'Uji pemahamanmu tentang konsep dasar Machine Learning.',
    timeLimit: 600,
    totalPoints: 150,
    passingScore: 75,
    questions: [
      {
        id: 'q2_1',
        type: 'multiple_choice',
        question: 'Apa itu Supervised Learning?',
        options: ['Pembelajaran dengan data berlabel', 'Pembelajaran tanpa data berlabel', 'Pembelajaran dengan reward', 'Pembelajaran mandiri'],
        correctAnswer: 'Pembelajaran dengan data berlabel',
      }
    ]
  },
  {
    id: 'q3',
    title: 'Deep Learning & Neural Networks',
    subject: 'Ilmu Komputer',
    grade: 'Kelas 12',
    difficulty: 'hard',
    description: 'Kuis lanjutan mengenai arsitektur Deep Learning.',
    timeLimit: 900,
    totalPoints: 200,
    passingScore: 80,
    questions: [
      {
        id: 'q3_1',
        type: 'multiple_choice',
        question: 'Apa fungsi dari Activation Function?',
        options: ['Menambahkan non-linearitas', 'Mempercepat training', 'Mengurangi loss', 'Menyimpan bobot'],
        correctAnswer: 'Menambahkan non-linearitas',
      }
    ]
  },
  {
    id: 'q4',
    title: 'Sejarah Kemerdekaan',
    subject: 'Sejarah',
    grade: 'Kelas 11',
    difficulty: 'medium',
    description: 'Uji pengetahuanmu tentang sejarah kemerdekaan Indonesia.',
    timeLimit: 600,
    totalPoints: 150,
    passingScore: 75,
    questions: [
      {
        id: 'q4_1',
        type: 'multiple_choice',
        question: 'Kapan Indonesia merdeka?',
        options: ['17 Agustus 1945', '1 Juni 1945', '20 Mei 1908', '28 Oktober 1928'],
        correctAnswer: '17 Agustus 1945',
      }
    ]
  },
  {
    id: 'q5',
    title: 'Aljabar Linear untuk AI',
    subject: 'Matematika',
    grade: 'Kelas 12',
    difficulty: 'hard',
    description: 'Penerapan matriks dan vektor dalam komputasi AI.',
    timeLimit: 1200,
    totalPoints: 250,
    passingScore: 70,
    questions: [
      {
        id: 'q5_1',
        type: 'multiple_choice',
        question: 'Apa hasil dari perkalian dot product dua vektor ortogonal?',
        options: ['0', '1', '-1', 'Tak terhingga'],
        correctAnswer: '0',
      }
    ]
  }
];

const initialQuizAttempts = [
  {
    id: 'a1',
    quizId: 'q1',
    userId: 'u1',
    score: 100,
    percentage: 100,
    timeSpent: 120,
    completedAt: new Date(),
    xpEarned: 100,
  }
];

const getDifficultyColor = (diff: string) => {
  switch (diff) {
    case 'easy': return 'bg-green-100 text-green-700';
    case 'medium': return 'bg-yellow-100 text-yellow-700';
    case 'hard': return 'bg-red-100 text-red-700';
    default: return 'bg-slate-100 text-slate-700';
  }
};

const getDifficultyLabel = (diff: string) => {
  switch (diff) {
    case 'easy': return 'Mudah';
    case 'medium': return 'Sedang';
    case 'hard': return 'Sulit';
    default: return 'Tidak Diketahui';
  }
};

// --- COMPONENT ---

export function QuizModule() {
  const { getRemedialContent } = useStudentProgress();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'available' | 'completed'>('available');
  
  // Quiz State
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [currentQuizId, setCurrentQuizId] = useState<string | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [consecutiveWrongAnswers, setConsecutiveWrongAnswers] = useState(0);
  const [showRemedial, setShowRemedial] = useState(false);
  
  // Results State
  const [showResults, setShowResults] = useState(false);
  const [quizResult, setQuizResult] = useState<any>(null);
  const [quizAttempts, setQuizAttempts] = useState(initialQuizAttempts);
  const [totalXP, setTotalXP] = useState(100);

  const remedialContent = currentQuizId ? getRemedialContent(currentQuizId) : null;

  // ... (rest of the component)


  const filteredQuizzes = quizzes.filter((quiz) => {
    const matchesSearch = quiz.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || quiz.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  const subjects = [...new Set(quizzes.map((q) => q.subject))];

  const handleStartQuiz = (quizId: string) => {
    setCurrentQuizId(quizId);
    setCurrentQuestionIdx(0);
    setAnswers({});
    setIsQuizActive(true);
    setShowResults(false);
  };

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmitQuiz = () => {
    const quiz = quizzes.find(q => q.id === currentQuizId);
    if (!quiz) return;

    // Check last question for remedial flow
    const lastQuestion = quiz.questions[currentQuestionIdx];
    const isLastCorrect = answers[lastQuestion.id] === lastQuestion.correctAnswer;
    
    if (!isLastCorrect) {
      const newWrongCount = consecutiveWrongAnswers + 1;
      if (newWrongCount >= 3) {
        setShowRemedial(true);
        setConsecutiveWrongAnswers(0);
        return; // Don't submit yet, show remedial
      }
    }

    let correctCount = 0;
    quiz.questions.forEach(q => {
      if (answers[q.id] === q.correctAnswer) {
        correctCount++;
      }
    });

    const percentage = Math.round((correctCount / quiz.questions.length) * 100);
    const score = Math.round((percentage / 100) * quiz.totalPoints);
    const xpEarned = percentage >= quiz.passingScore ? score : 0;

    const result = {
      id: Math.random().toString(36).substring(7),
      quizId: quiz.id,
      userId: 'u1',
      answers,
      score,
      percentage,
      timeSpent: 0, // Mock
      completedAt: new Date(),
      xpEarned,
    };

    setQuizResult(result);
    setQuizAttempts(prev => [result, ...prev]);
    setTotalXP(prev => prev + xpEarned);
    
    setIsQuizActive(false);
    setShowResults(true);
  };

  const handleNext = () => {
    const quiz = quizzes.find(q => q.id === currentQuizId);
    if (!quiz) return;
    
    const question = quiz.questions[currentQuestionIdx];
    const isCorrect = answers[question.id] === question.correctAnswer;
    
    if (!isCorrect) {
      const newWrongCount = consecutiveWrongAnswers + 1;
      setConsecutiveWrongAnswers(newWrongCount);
      if (newWrongCount >= 3) {
        setShowRemedial(true);
        setConsecutiveWrongAnswers(0);
        return;
      }
    } else {
      setConsecutiveWrongAnswers(0);
    }
    
    setCurrentQuestionIdx(i => i + 1);
  };

  const currentQuiz = quizzes.find(q => q.id === currentQuizId);

  // Quiz Taking View
  if (isQuizActive && currentQuiz) {
    if (showRemedial) {
      return (
        <div className="max-w-2xl mx-auto flex-1 w-full flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center">
            <Sparkles className="w-12 h-12 text-orange-500" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900">{remedialContent?.title || 'Mari Kita Ulangi Sebentar!'}</h2>
          <p className="text-lg text-slate-600">
            {remedialContent?.description || 'Sistem mendeteksi Anda kesulitan dengan beberapa pertanyaan terakhir. Mari kita pelajari ulang konsep dasarnya.'}
          </p>
          <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-slate-200 aspect-[4/3] flex items-center justify-center cursor-pointer hover:scale-105 transition-transform">
            <p className="text-2xl font-bold text-slate-800">{remedialContent?.content || 'Materi Remedial'}</p>
          </div>
          <button 
            onClick={() => setShowRemedial(false)}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg transition-colors"
          >
            Kembali ke Kuis
          </button>
        </div>
      );
    }

    const question = currentQuiz.questions[currentQuestionIdx];
    const isLastQuestion = currentQuestionIdx === currentQuiz.questions.length - 1;
    const hasAnswer = answers[question.id] !== undefined;

    return (
      <QuizTakingView
        quiz={currentQuiz}
        question={question}
        currentQuestion={currentQuestionIdx}
        totalQuestions={currentQuiz.questions.length}
        answers={answers}
        onAnswer={(answer: string) => handleAnswer(question.id, answer)}
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
        <button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-opacity w-fit">
          <Sparkles className="w-4 h-4" />
          Generate Kuis AI
        </button>
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
              {quizAttempts.length > 0 ? Math.round(quizAttempts.reduce((acc, a) => acc + a.percentage, 0) / quizAttempts.length) : 0}%
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
          {filteredQuizzes.map((quiz) => (
            <QuizCard
              key={quiz.id}
              quiz={quiz}
              onStart={() => handleStartQuiz(quiz.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {quizAttempts.map((attempt) => {
            const quiz = quizzes.find((q) => q.id === attempt.quizId);
            if (!quiz) return null;
            return (
              <QuizAttemptCard key={attempt.id} attempt={attempt} quiz={quiz} />
            );
          })}
        </div>
      )}
    </div>
  );
}

function QuizCard({ quiz, onStart }: { quiz: any; onStart: () => void }) {
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
            <p className="text-sm text-slate-500 mt-1">{quiz.subject} • {quiz.grade}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0">
            <Target className="w-5 h-5 text-white" />
          </div>
        </div>
        
        <p className="text-sm text-slate-600 mb-6 line-clamp-2 flex-1">{quiz.description}</p>
        
        <div className="flex items-center gap-4 text-sm font-medium text-slate-500 mb-6">
          <div className="flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4" />
            <span>{quiz.questions.length} soal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>{Math.floor(quiz.timeLimit / 60)} m</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span>{quiz.totalPoints} XP</span>
          </div>
        </div>

        <button onClick={onStart} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
          <Play className="w-4 h-4 fill-current" />
          Mulai Kuis
        </button>
      </div>
    </motion.div>
  );
}

function QuizAttemptCard({ attempt, quiz }: { attempt: any; quiz: any }) {
  const passed = attempt.percentage >= quiz.passingScore;
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
          <h4 className="font-bold text-slate-900">{quiz.title}</h4>
          <p className="text-sm text-slate-500">
            {attempt.completedAt.toLocaleDateString('id-ID')}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className={cn(
          'text-2xl font-black tracking-tight',
          passed ? 'text-green-600' : 'text-red-600'
        )}>
          {attempt.percentage}%
        </p>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {attempt.score}/{quiz.totalPoints} poin
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
}: any) {
  // Simple mock timer
  const [timeLeft, setTimeLeft] = useState(quiz.timeLimit);
  
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
        <h3 className="text-xl font-medium text-slate-900 mb-8 leading-relaxed">{question.question}</h3>

        <div className="space-y-3">
          {question.options.map((option: string, index: number) => {
            const isSelected = answers[question.id] === option;
            return (
              <button
                key={index}
                onClick={() => onAnswer(option)}
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
                <span className="font-medium text-base">{option}</span>
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
            disabled={!hasAnswer} 
            className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            Selesai
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
  const passed = result.percentage >= quiz.passingScore;

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

        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-3xl font-black text-slate-800">{result.percentage}%</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Nilai</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-3xl font-black text-slate-800">{result.score}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Poin</p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-100">
            <p className="text-3xl font-black text-yellow-600">+{result.xpEarned}</p>
            <p className="text-xs font-bold text-yellow-600/60 uppercase tracking-wider mt-1">XP</p>
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
