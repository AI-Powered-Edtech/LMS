import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, ArrowRight, Flag, AlertTriangle, WifiOff, Eye } from 'lucide-react';
import { cn } from '@/src/utils/cn';
import { quizService, SubmitAnswer } from '@/src/services/quizService';
import { QuizTimer, useQuizTimer } from './QuizTimer';
import { QuestionPalette } from './QuestionPalette';
import { AutosaveIndicator, SaveStatus } from './AutosaveIndicator';
import { QuizReviewScreen } from './QuizReviewScreen';

interface QuizTakingViewProps {
  attemptId: string;
  expiresAt: string | null;
  quiz: any;
  attemptQuestions: any[];
  answers: Record<string, SubmitAnswer>;
  onAnswer: (questionId: string, answer: SubmitAnswer) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  showReview: boolean;
  setShowReview: (show: boolean) => void;
}

export function QuizTakingView({
  attemptId,
  expiresAt,
  quiz,
  attemptQuestions,
  answers,
  onAnswer,
  onSubmit,
  isSubmitting,
  showReview,
  setShowReview,
}: QuizTakingViewProps) {
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [tabWarning, setTabWarning] = useState(false);

  const totalQuestions = attemptQuestions.length;
  const question = attemptQuestions[currentQuestionIdx];

  const { timeLeft, isCritical, progressColor } = useQuizTimer(expiresAt, quiz.time_limit_minutes, onSubmit);

  // ── Network status ──────────────────────────────────────
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // ── Anti-cheat: tab switch detection ────────────────────
  useEffect(() => {
    if (!attemptId) return;
    const handler = () => {
      if (document.hidden) {
        setTabWarning(true);
        quizService.recordCheatingSignal(attemptId, 'TAB_SWITCH', {
          timestamp: new Date().toISOString(),
        });
        // Auto-dismiss after 5s
        setTimeout(() => setTabWarning(false), 5000);
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [attemptId]);

  // ── Heartbeat tracking ──────────────────────────────────
  useEffect(() => {
    if (!attemptId) return;
    const interval = setInterval(() => quizService.recordHeartbeat(attemptId), 30000);
    return () => clearInterval(interval);
  }, [attemptId]);

  // ── Autosave via V1 batch RPC ───────────────────────────
  const dirtyAnswersRef = useRef<Record<string, SubmitAnswer>>({});
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushSave = useCallback(async () => {
    const dirty = dirtyAnswersRef.current;
    const keys = Object.keys(dirty);
    if (keys.length === 0 || !attemptId) return;

    const batch = keys.map(qId => dirty[qId]);
    dirtyAnswersRef.current = {};

    try {
      setSaveStatus('saving');
      await quizService.batchSaveAnswers(attemptId, batch);
      setSaveStatus('saved');
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Autosave failed:', err);
      // Put back failed answers so they retry
      keys.forEach(k => {
        if (!dirtyAnswersRef.current[k]) dirtyAnswersRef.current[k] = batch.find(b => b.question_id === k)!;
      });
      setSaveStatus(isOnline ? 'error' : 'offline');
    }
  }, [attemptId, isOnline]);

  // Track dirty answers and trigger debounced save
  const handleAnswer = useCallback((questionId: string, answer: SubmitAnswer) => {
    onAnswer(questionId, answer);
    dirtyAnswersRef.current[questionId] = answer;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => flushSave(), 3000);
  }, [onAnswer, flushSave]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      flushSave();
    };
  }, [flushSave]);

  // ── Keyboard navigation ────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName || '')) return;

      if (e.key === 'ArrowRight' && currentQuestionIdx < totalQuestions - 1 && !showReview) {
        setCurrentQuestionIdx(i => i + 1);
      }
      if (e.key === 'ArrowLeft' && currentQuestionIdx > 0 && !showReview) {
        setCurrentQuestionIdx(i => i - 1);
      }
      if (e.key.toLowerCase() === 'f' && question && !showReview) {
        toggleFlag(question.id);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentQuestionIdx, totalQuestions, question, showReview]);

  // ── beforeunload warning ────────────────────────────────
  useEffect(() => {
    if (showReview) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [showReview]);

  const toggleFlag = (id: string) => {
    setFlagged(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Review Screen ───────────────────────────────────────
  if (showReview) {
    return (
      <QuizReviewScreen
        questions={attemptQuestions}
        answers={answers}
        flagged={flagged}
        onBack={() => setShowReview(false)}
        onSubmit={onSubmit}
        onJump={(index) => {
          setCurrentQuestionIdx(index);
          setShowReview(false);
        }}
        isSubmitting={isSubmitting}
      />
    );
  }

  if (!question) return null;

  const isLastQuestion = currentQuestionIdx === totalQuestions - 1;
  const questionType = question.question_type || 'MCQ';
  const currentAnswer = answers[question.id];

  return (
    <div className="flex-1 w-full">
      {/* ── Floating Warnings ─────────────────────────── */}
      {tabWarning && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3 px-5 py-3 bg-amber-50 border border-amber-200 rounded-2xl shadow-lg">
            <Eye className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold text-amber-800 text-sm">Anda meninggalkan tab kuis</p>
              <p className="text-xs text-amber-600">Aktivitas ini telah dicatat</p>
            </div>
          </div>
        </div>
      )}

      {!isOnline && (
        <div className="mb-4">
          <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl">
            <WifiOff className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold text-amber-800 text-sm">Koneksi terputus</p>
              <p className="text-xs text-amber-600">Jawaban Anda disimpan secara lokal dan akan disinkronkan saat online</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-900">{quiz.title}</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm font-medium text-slate-500">
              Soal {currentQuestionIdx + 1} dari {totalQuestions}
            </p>
            <AutosaveIndicator status={!isOnline ? 'offline' : saveStatus} />
          </div>
        </div>
        <QuizTimer timeLeft={timeLeft} />
      </div>

      {/* ── 2-Column Layout ───────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar — Desktop only */}
        <div className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-6 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <QuestionPalette
                questions={attemptQuestions}
                currentQuestionIdx={currentQuestionIdx}
                answers={answers}
                flagged={flagged}
                onJump={setCurrentQuestionIdx}
                orientation="vertical"
              />
            </div>
          </div>
        </div>

        {/* Main Question Area */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Mobile Question Palette — horizontally scrollable */}
          <div className="lg:hidden">
            <QuestionPalette
              questions={attemptQuestions}
              currentQuestionIdx={currentQuestionIdx}
              answers={answers}
              flagged={flagged}
              onJump={setCurrentQuestionIdx}
              orientation="horizontal"
            />
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={cn("h-full transition-all duration-300 rounded-full", progressColor)}
              style={{ width: `${((currentQuestionIdx + 1) / totalQuestions) * 100}%` }}
            />
          </div>

          {/* Question Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 relative">
            {/* Flag Button */}
            <button
              onClick={() => toggleFlag(question.id)}
              className={cn(
                "absolute top-6 right-6 p-2 rounded-xl border transition-colors flex items-center gap-2 text-sm font-bold",
                flagged.has(question.id) ? "bg-yellow-100 border-yellow-200 text-yellow-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
              )}
            >
              <Flag className={cn("w-4 h-4", flagged.has(question.id) && "fill-current")} />
              {flagged.has(question.id) ? 'Ditandai' : 'Tandai'}
            </button>

            {/* Question Type Badge */}
            <div className="flex items-center gap-2 mb-4">
              <span className={cn(
                'inline-block px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider',
                questionType === 'ESSAY' ? 'bg-purple-100 text-purple-700' :
                questionType === 'SHORT_ANSWER' ? 'bg-amber-100 text-amber-700' :
                questionType === 'MULTIPLE_SELECT' ? 'bg-cyan-100 text-cyan-700' :
                questionType === 'TRUE_FALSE' ? 'bg-teal-100 text-teal-700' :
                'bg-blue-100 text-blue-700'
              )}>
                {questionType === 'MCQ' ? 'Pilihan Ganda' :
                 questionType === 'TRUE_FALSE' ? 'Benar / Salah' :
                 questionType === 'MULTIPLE_SELECT' ? 'Pilihan Banyak' :
                 questionType === 'SHORT_ANSWER' ? 'Jawaban Singkat' :
                 questionType === 'ESSAY' ? 'Esai' : 'Soal'}
              </span>
              {question.points && question.points > 0 && (
                <span className="text-xs font-bold text-slate-400">{question.points} poin</span>
              )}
            </div>

            <h3 className="text-xl font-medium text-slate-900 mb-8 leading-relaxed mt-4 pr-24">{question.text}</h3>

            {/* MCQ / TRUE_FALSE — Radio Buttons */}
            {(questionType === 'MCQ' || questionType === 'TRUE_FALSE') && (
              <div className="space-y-3">
                {question.quiz_options?.map((option: any) => {
                  const isSelected = currentAnswer?.selected_option_ids?.includes(option.id) ?? false;
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleAnswer(question.id, { question_id: question.id, selected_option_ids: [option.id] })}
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
            )}

            {/* MULTIPLE_SELECT — Checkboxes */}
            {questionType === 'MULTIPLE_SELECT' && (
              <div className="space-y-3">
                <p className="text-sm text-slate-500 -mt-4 mb-4 italic">Pilih semua jawaban yang benar</p>
                {question.quiz_options?.map((option: any) => {
                  const currentIds = currentAnswer?.selected_option_ids || [];
                  const isSelected = currentIds.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      onClick={() => {
                        const newIds = isSelected
                          ? currentIds.filter((id: string) => id !== option.id)
                          : [...currentIds, option.id];
                        handleAnswer(question.id, { question_id: question.id, selected_option_ids: newIds });
                      }}
                      className={cn(
                        'w-full flex items-center space-x-4 p-4 rounded-2xl border-2 text-left transition-all',
                        isSelected
                          ? 'border-cyan-500 bg-cyan-50 text-cyan-900'
                          : 'border-slate-100 hover:border-cyan-200 hover:bg-slate-50 text-slate-700'
                      )}
                    >
                      <div className={cn(
                        "w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0",
                        isSelected ? "border-cyan-500 bg-cyan-500" : "border-slate-300"
                      )}>
                        {isSelected && (
                          <svg className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <span className="font-medium text-base">{option.text}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* SHORT_ANSWER — Text Input */}
            {questionType === 'SHORT_ANSWER' && (
              <div>
                <input
                  type="text"
                  value={currentAnswer?.text_answer || ''}
                  onChange={(e) => handleAnswer(question.id, { question_id: question.id, text_answer: e.target.value, selected_option_ids: [] })}
                  placeholder="Ketik jawaban singkat Anda..."
                  className="w-full px-5 py-4 rounded-2xl border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base font-medium text-slate-800 placeholder-slate-400 transition-all"
                  autoFocus
                />
              </div>
            )}

            {/* ESSAY — Textarea */}
            {questionType === 'ESSAY' && (
              <div>
                <textarea
                  value={currentAnswer?.text_answer || ''}
                  onChange={(e) => handleAnswer(question.id, { question_id: question.id, text_answer: e.target.value, selected_option_ids: [] })}
                  placeholder="Tulis jawaban esai Anda di sini..."
                  rows={8}
                  className="w-full px-5 py-4 rounded-2xl border-2 border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none text-base font-medium text-slate-800 placeholder-slate-400 transition-all resize-y min-h-[150px]"
                  autoFocus
                />
                <p className="text-xs text-slate-400 mt-2 text-right">
                  {(currentAnswer?.text_answer || '').length} karakter
                </p>
              </div>
            )}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-2 pb-6">
            <button
              onClick={() => setCurrentQuestionIdx(i => i - 1)}
              disabled={currentQuestionIdx === 0}
              className="px-4 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent flex items-center gap-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Sebelumnya
            </button>

            {isLastQuestion ? (
              <button
                onClick={() => setShowReview(true)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm"
              >
                Selesai & Review
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setCurrentQuestionIdx(i => i + 1)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm"
              >
                Selanjutnya
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
