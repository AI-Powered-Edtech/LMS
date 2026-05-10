import { useEffect, useMemo, useRef, useState } from "react";

import { useOptionalLearningSession } from "@/features/analytics";
import { type QuizAttemptResult, quizService } from "@/features/quizzes";
import { useQuizAutosave } from "@/features/quizzes/hooks/useQuizAutosave";
import type { SubmitAnswer } from "@/features/quizzes/types/quizzes.types";
import { xapi } from "@/features/xapi";

import type {
  MultiTypeAnswer,
  QuestionType,
  QuizQuestion,
} from "./quizViewerTypes";

interface UseQuizViewerStateParams {
  quizId: string;
  questions: QuizQuestion[];
  maxAttempts: number;
  onCompletionMet: () => void;
  onStartViewing: () => void;
}

export function useQuizViewerState({
  quizId,
  questions,
  maxAttempts,
  onCompletionMet,
  onStartViewing,
}: UseQuizViewerStateParams) {
  const [answers, setAnswers] = useState<Record<string, MultiTypeAnswer>>({});
  const [result, setResult] = useState<QuizAttemptResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [attemptNumber, setAttemptNumber] = useState<number | null>(null);

  const { trackEvent } = useOptionalLearningSession();

  const attemptIdRef = useRef<string | null>(null);
  const attemptVersionRef = useRef<number | undefined>(undefined);
  const attemptNumberRef = useRef<number | null>(null);
  const startAttemptPromise = useRef<Promise<{
    id: string;
    version?: number;
    attempt_number?: number;
  }> | null>(null);

  // Autosave setup
  const quizServiceWithSaveProgress = useMemo(
    () => ({
      saveProgress: async (
        attemptId: string,
        answers: Record<string, unknown>,
      ) => {
        const submitAnswers: SubmitAnswer[] = Object.entries(answers).map(
          ([questionId, answer]) => ({
            question_id: questionId,
            selected_option_ids:
              (answer as { selected_option_ids?: string[] })
                ?.selected_option_ids || [],
            text_answer: (answer as { text_answer?: string })?.text_answer,
          }),
        );
        await quizService.batchSaveAnswers(attemptId, submitAnswers);
      },
    }),
    [],
  );

  const { lastSaved, isSaving } = useQuizAutosave({
    attemptId: attemptId || "",
    answers: answers as Record<string, unknown>,
    quizService: quizServiceWithSaveProgress,
    intervalMs: 30000,
  });

  const [showSavedIndicator, setShowSavedIndicator] = useState(false);

  useEffect(() => {
    if (lastSaved && !isSaving) {
      setShowSavedIndicator(true);
      const timer = setTimeout(() => setShowSavedIndicator(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [lastSaved, isSaving]);

  const ensureAttemptStarted = async () => {
    if (attemptIdRef.current) {
      return {
        id: attemptIdRef.current,
        version: attemptVersionRef.current,
        attempt_number: attemptNumberRef.current ?? undefined,
      };
    }

    if (startAttemptPromise.current) {
      return startAttemptPromise.current;
    }

    startAttemptPromise.current = (async () => {
      onStartViewing();
      try {
        const res = await quizService.startQuizAttempt(quizId);
        attemptIdRef.current = res.attempt_id;
        attemptVersionRef.current = res.version;
        attemptNumberRef.current = res.attempt_number ?? null;
        setAttemptId(res.attempt_id);
        attemptVersionRef.current = res.version;
        setAttemptNumber(res.attempt_number ?? null);
        trackEvent("QUIZ_STARTED", {
          quiz_id: quizId,
          attempt: res.attempt_number ?? 1,
        });
        return {
          id: res.attempt_id,
          version: res.version,
          attempt_number: res.attempt_number,
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Gagal memulai kuis";
        setError(message);
        attemptIdRef.current = null;
        attemptVersionRef.current = undefined;
        attemptNumberRef.current = null;
        throw err;
      } finally {
        startAttemptPromise.current = null;
      }
    })();

    return startAttemptPromise.current;
  };

  const hasAttemptsLeft = !maxAttempts || (attemptNumber ?? 0) < maxAttempts;

  const handleSelectOption = async (questionId: string, optionId: string) => {
    await ensureAttemptStarted();
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { selected_option_ids: [optionId] },
    }));
  };

  const handleToggleOption = async (questionId: string, optionId: string) => {
    await ensureAttemptStarted();
    setAnswers((prev) => {
      const current = prev[questionId]?.selected_option_ids || [];
      const nextIds = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return {
        ...prev,
        [questionId]: { ...prev[questionId], selected_option_ids: nextIds },
      };
    });
  };

  const handleTextChange = async (questionId: string, text: string) => {
    await ensureAttemptStarted();
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        selected_option_ids: [],
        text_answer: text,
      },
    }));
  };

  const getQuestionType = (q: QuizQuestion): QuestionType =>
    q.question_type || "MCQ";

  const isQuestionAnswered = (q: QuizQuestion): boolean => {
    const ans = answers[q.id];
    if (!ans) return false;
    const type = getQuestionType(q);
    if (type === "SHORT_ANSWER" || type === "ESSAY")
      return !!ans.text_answer?.trim();
    return ans.selected_option_ids.length > 0;
  };

  const allAnswered = (questions ?? []).every((q) => isQuestionAnswered(q));

  const handleSubmit = async () => {
    if (!allAnswered || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const currentAttempt = await ensureAttemptStarted();
      if (!currentAttempt || !currentAttempt.id)
        throw new Error("Could not start quiz attempt");

      const submitAnswers = questions.map((q) => ({
        question_id: q.id,
        selected_option_ids: answers[q.id]?.selected_option_ids || [],
        text_answer: answers[q.id]?.text_answer || undefined,
      }));

      const gradeResult = await quizService.submitQuizAttempt(
        currentAttempt.id,
        submitAnswers,
        currentAttempt.version,
      );
      setResult(gradeResult);
      if (
        currentAttempt.attempt_number !== undefined &&
        currentAttempt.attempt_number !== null
      ) {
        setAttemptNumber(currentAttempt.attempt_number);
      }

      trackEvent("QUIZ_SUBMITTED", {
        quiz_id: quizId,
        score: gradeResult.score,
        max_score: 100,
        attempt: currentAttempt.attempt_number ?? 1,
      });

      // xAPI: record quiz attempt — fire-and-forget
      xapi
        .quizAttempted(
          quizId,
          gradeResult.score ?? 0,
          gradeResult.passed ?? false,
        )
        .catch(() => {});
      if (gradeResult.passed) {
        xapi.quizPassed(quizId, gradeResult.score ?? 0).catch(() => {});
        onCompletionMet();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim jawaban");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    if (!hasAttemptsLeft) {
      setError(`Anda telah mencapai batas maksimal ${maxAttempts} percobaan.`);
      return;
    }
    setAnswers({});
    setResult(null);
    setError(null);
    setAttemptId(null);
    attemptVersionRef.current = undefined;
    setAttemptNumber(attemptNumber !== null ? attemptNumber : null);
    attemptIdRef.current = null;
    attemptVersionRef.current = undefined;
    attemptNumberRef.current = null;
  };

  return {
    answers,
    result,
    isSubmitting,
    error,
    attemptNumber,
    hasAttemptsLeft,
    showSavedIndicator,
    isSaving,
    allAnswered,
    handleSelectOption,
    handleToggleOption,
    handleTextChange,
    getQuestionType,
    isQuestionAnswered,
    handleSubmit,
    handleRetry,
  };
}
