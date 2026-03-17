// Quiz Player - Orchestrator component
// Part of the Quiz Engine Refactor

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Eye, WifiOff } from 'lucide-react';
import { cn } from '@/src/utils/cn';
import type { SubmitAnswer } from '../../types/quizzes.types';
import { useQuizTimer } from '../../hooks/useQuizTimer';
import { useAutosaveAnswers } from '../../hooks/useAutosaveAnswers';
import type { SaveStatus } from '../../types/quizzes.types';
import { useAntiCheat } from '../../hooks/useAntiCheat';
import { useQuizHeartbeat } from '../../hooks/useQuizHeartbeat';
// Presentational components - temporarily import from pages/quiz
import { QuizHeader } from './QuizHeader';
import { QuizBody } from './QuizBody';
import { QuizFooter } from './QuizFooter';
import { QuestionPalette } from './QuestionPalette';
import { QuizReviewScreen } from './QuizReviewScreen';

interface QuizPlayerProps {
  attemptId: string;
  expiresAt: string | null;
  quiz: {
    id: string;
    title: string;
    time_limit_minutes?: number;
  };
  attemptQuestions: Array<{
    id: string;
    question_type?: string;
    question_text?: string;
    options?: Array<{ id: string; text: string }>;
  }>;
  initialAnswers?: Record<string, SubmitAnswer>;
  initialQuestionIndex?: number;
  onSubmit: (answers: Record<string, SubmitAnswer>) => void;
  isSubmitting: boolean;
}

// Legacy SaveStatus for compatibility
export type { SaveStatus };

export function QuizPlayer({
  attemptId,
  expiresAt,
  quiz,
  attemptQuestions,
  initialAnswers = {},
  initialQuestionIndex = 0,
  onSubmit,
  isSubmitting,
}: QuizPlayerProps) {
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(initialQuestionIndex);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [showReview, setShowReview] = useState(false);
  const [answers, setAnswers] = useState<Record<string, SubmitAnswer>>(initialAnswers);

  const totalQuestions = attemptQuestions.length;
  const question = attemptQuestions[currentQuestionIdx];

  // ── Hooks composition ───────────────────────────────────
  const { timeLeft, isCritical, progressColor } = useQuizTimer({
    expiresAt,
    timeLimitMinutes: quiz.time_limit_minutes || 10,
    onTimeUp: () => onSubmit(answers),
  });

  const { saveStatus, isOnline, setAnswer: setAutoSaveAnswer, flushSave } = useAutosaveAnswers({
    attemptId,
    debounceMs: 3000,
  });

  const { tabWarning } = useAntiCheat({ attemptId });

  useQuizHeartbeat({ attemptId, intervalMs: 30000 });

  // ── Answer handling ─────────────────────────────────────
  const handleAnswer = useCallback((questionId: string, answer: SubmitAnswer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
    setAutoSaveAnswer(questionId, answer);
  }, [setAutoSaveAnswer]);

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

  // ── Flag toggle ───────────────────────────────────────
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
        onSubmit={() => onSubmit(answers)}
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
            <AnimatePresence mode="wait">
              <motion.div
                key={question.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <QuizBody 
                  question={question}
                  questionType={questionType}
                  currentAnswer={currentAnswer}
                  isFlagged={flagged.has(question.id)}
                  onToggleFlag={toggleFlag}
                  onAnswer={handleAnswer}
                />
              </motion.div>
            </AnimatePresence>

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
