import { useState, useEffect, useRef, useCallback } from 'react';
import { Eye, WifiOff } from 'lucide-react';
import { cn } from '@/src/utils/cn';
import { quizService, SubmitAnswer } from '@/src/services/quizService';
import { useQuizTimer } from './QuizTimer';
import { QuestionPalette } from './QuestionPalette';
import { SaveStatus } from './AutosaveIndicator';
import { QuizReviewScreen } from './QuizReviewScreen';
import { QuizHeader } from './QuizHeader';
import { QuizBody } from './QuizBody';
import { QuizFooter } from './QuizFooter';

interface QuizPlayerProps {
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

export function QuizPlayer({
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
}: QuizPlayerProps) {
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
        setFlagged(prev => {
          const next = new Set(prev);
          if (next.has(question.id)) next.delete(question.id);
          else next.add(question.id);
          return next;
        });
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
    <div className="flex-1 w-full flex flex-col items-center">
      <div className="w-full max-w-6xl">
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
        <QuizHeader 
          title={quiz.title}
          currentQuestionIdx={currentQuestionIdx}
          totalQuestions={totalQuestions}
          saveStatus={saveStatus}
          isOnline={isOnline}
          timeLeft={timeLeft}
        />

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

            {/* Question Body */}
            <QuizBody 
              question={question}
              questionType={questionType}
              currentAnswer={currentAnswer}
              isFlagged={flagged.has(question.id)}
              onToggleFlag={toggleFlag}
              onAnswer={handleAnswer}
            />

            {/* Navigation Controls */}
            <QuizFooter 
              currentQuestionIdx={currentQuestionIdx}
              isLastQuestion={isLastQuestion}
              onPrevious={() => setCurrentQuestionIdx(i => i - 1)}
              onNext={() => setCurrentQuestionIdx(i => i + 1)}
              onFinish={() => setShowReview(true)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
