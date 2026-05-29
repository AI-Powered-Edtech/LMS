import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useBuilder } from "@/contexts/BuilderContext";
import {
  builderQuizService,
  type QuizBlockData,
} from "@/features/courses/api/builder/quizBuilderService";
import type { QuestionType } from "@/features/quizzes";
import {
  deletePoolConfig,
  getPoolConfigs,
  type PoolConfig,
  type PoolConfigInput,
  savePoolConfig,
} from "@/features/quizzes/api/questionBankService";
import { QuizStatus } from "@/features/quizzes/types/quizzes.types";

export function useQuizEditorState(_blockId: string) {
  const { tenantId } = useAuth();
  const { state } = useBuilder();
  // Bolt Performance: Replaced slow `.flatMap().find()` with `useMemo` & early return `for...of` loop
  const activeLesson = useMemo(() => {
    const activeId = state.activeLesson?.id;
    if (!activeId) return undefined;
    for (const module of state.modules) {
      for (const lesson of module.lessons) {
        if (lesson.id === activeId) {
          return lesson;
        }
      }
    }
    return undefined;
  }, [state.modules, state.activeLesson?.id]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedQuizId, setSavedQuizId] = useState<string | undefined>(undefined);
  const [quizStatus, setQuizStatus] = useState<QuizStatus>("draft");
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // ── Phase 33A: Pool Config State ─────────────────────────────────────────
  const [poolConfigs, setPoolConfigs] = useState<PoolConfig[]>([]);
  const [isLoadingPoolConfigs, setIsLoadingPoolConfigs] = useState(false);
  const [poolConfigError, setPoolConfigError] = useState<string | null>(null);

  const [quizData, setQuizData] = useState<QuizBlockData>({
    title: "Kuis Baru",
    instructions: "",
    max_attempts: 1,
    passing_score: 70,
    shuffle_questions: false,
    shuffle_options: false,
    status: "draft",
    questions: [],
  });

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!activeLesson) return;
    async function load() {
      try {
        const data = (await builderQuizService.getQuizByLesson(
          activeLesson!.id,
          tenantId!,
        )) as any;
        if (data) {
          setSavedQuizId(data.id);
          setQuizStatus((data.status as QuizStatus) || "draft");
          setQuizData({
            id: data.id,
            title: data.title || "",
            instructions: data.instructions || "",
            max_attempts: data.max_attempts || 1,
            passing_score: data.passing_score || 70,
            shuffle_questions: data.shuffle_questions || false,
            shuffle_options: data.shuffle_options || false,
            status: data.status || "draft",
            questions: (data.quiz_questions || [])
              .sort(
                (a: { order: number }, b: { order: number }) =>
                  a.order - b.order,
              )
              .map(
                (q: {
                  id: string;
                  text: string;
                  order: number;
                  question_type?: string;
                  points?: number;
                  explanation?: string;
                  quiz_options?: unknown[];
                }) => ({
                  id: q.id,
                  text: q.text,
                  order: q.order,
                  question_type: (q.question_type || "MCQ") as QuestionType,
                  points: q.points ?? 1,
                  explanation: q.explanation || "",
                  options: (q.quiz_options || []) as {
                    id?: string;
                    text: string;
                    is_correct: boolean;
                  }[],
                }),
              ),
          });
        }
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Kesalahan tidak diketahui",
        );
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, [activeLesson?.id]);
  /* eslint-enable react-hooks/exhaustive-deps */

  // ── Phase 33A: Load pool configs when quizId becomes available ────────────
  useEffect(() => {
    if (!savedQuizId || !tenantId) return;

    setIsLoadingPoolConfigs(true);
    setPoolConfigError(null);

    getPoolConfigs(savedQuizId, tenantId)
      .then((configs) => setPoolConfigs(configs))
      .catch((err: unknown) =>
        setPoolConfigError(
          err instanceof Error ? err.message : "Gagal memuat konfigurasi pool",
        ),
      )
      .finally(() => setIsLoadingPoolConfigs(false));
  }, [savedQuizId, tenantId]);

  const handleSave = async (targetStatus: QuizStatus = quizStatus) => {
    if (!activeLesson) return;
    setIsSaving(true);
    setError(null);
    try {
      const payload: QuizBlockData = {
        ...quizData,
        id: savedQuizId,
        status: targetStatus,
      };
      const result = await builderQuizService.saveQuizData(
        activeLesson.id,
        activeLesson.tenantId,
        payload,
      );
      setSavedQuizId(result.quiz_id);
      setQuizStatus(targetStatus);
      setQuizData((prev) => ({
        ...prev,
        id: result.quiz_id,
        status: targetStatus,
      }));
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Kesalahan tidak diketahui",
      );
    } finally {
      setIsSaving(false);
      setIsPublishing(false);
    }
  };

  const handlePublishToggle = async () => {
    setIsPublishing(true);
    const next: QuizStatus = quizStatus === "published" ? "draft" : "published";
    await handleSave(next);
  };

  const addQuestion = () => {
    setQuizData((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          text: "",
          order: prev.questions.length + 1,
          question_type: "MCQ" as QuestionType,
          points: 1,
          explanation: "",
          options: [
            { text: "Opsi A", is_correct: true },
            { text: "Opsi B", is_correct: false },
          ],
        },
      ],
    }));
  };

  const updateQuestion = (idx: number, text: string) => {
    const qs = [...quizData.questions];
    qs[idx] = { ...qs[idx], text };
    setQuizData({ ...quizData, questions: qs });
  };

  const removeQuestion = (idx: number) => {
    const qs = [...quizData.questions];
    qs.splice(idx, 1);
    setQuizData({ ...quizData, questions: qs });
  };

  const addOption = (qIdx: number) => {
    const qs = [...quizData.questions];
    qs[qIdx].options.push({ text: "Opsi Baru", is_correct: false });
    setQuizData({ ...quizData, questions: qs });
  };

  const updateOption = (qIdx: number, oIdx: number, text: string) => {
    const qs = [...quizData.questions];
    qs[qIdx].options[oIdx].text = text;
    setQuizData({ ...quizData, questions: qs });
  };

  const removeOption = (qIdx: number, oIdx: number) => {
    const qs = [...quizData.questions];
    qs[qIdx].options.splice(oIdx, 1);
    setQuizData({ ...quizData, questions: qs });
  };

  const setCorrectOption = (qIdx: number, oIdx: number) => {
    const qs = [...quizData.questions];
    const qType = qs[qIdx].question_type || "MCQ";
    if (qType === "MULTIPLE_SELECT") {
      qs[qIdx].options[oIdx].is_correct = !qs[qIdx].options[oIdx].is_correct;
    } else {
      qs[qIdx].options.forEach((o, i) => {
        o.is_correct = i === oIdx;
      });
    }
    setQuizData({ ...quizData, questions: qs });
  };

  const updateQuestionType = (qIdx: number, newType: QuestionType) => {
    const qs = [...quizData.questions];
    qs[qIdx] = { ...qs[qIdx], question_type: newType };
    if (newType === "TRUE_FALSE") {
      qs[qIdx].options = [
        { text: "Benar", is_correct: true },
        { text: "Salah", is_correct: false },
      ];
    }
    if (newType === "SHORT_ANSWER" || newType === "ESSAY") {
      qs[qIdx].options = [];
    }
    if (
      (newType === "MCQ" || newType === "MULTIPLE_SELECT") &&
      qs[qIdx].options.length === 0
    ) {
      qs[qIdx].options = [
        { text: "Opsi A", is_correct: true },
        { text: "Opsi B", is_correct: false },
      ];
    }
    setQuizData({ ...quizData, questions: qs });
  };

  const updateQuestionPoints = (qIdx: number, pts: number) => {
    const qs = [...quizData.questions];
    qs[qIdx] = { ...qs[qIdx], points: pts };
    setQuizData({ ...quizData, questions: qs });
  };

  const isPublished = quizStatus === "published";

  // ── Phase 33A: Pool mode is active when at least one pool config exists ───
  const isPoolMode = useMemo(() => poolConfigs.length > 0, [poolConfigs]);

  /**
   * Add or update a pool config for this quiz.
   * Calls the service, then merges the result into local state.
   */
  const addPoolConfig = async (input: PoolConfigInput): Promise<void> => {
    if (!savedQuizId || !tenantId) return;
    const saved = await savePoolConfig(
      { ...input, quizId: savedQuizId },
      tenantId,
    );
    setPoolConfigs((prev) => {
      const idx = prev.findIndex(
        (c) => c.id === saved.id || c.bank_id === saved.bank_id,
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [...prev, saved];
    });
  };

  /**
   * Remove a pool config from this quiz by its config id.
   */
  const removePoolConfig = async (configId: string): Promise<void> => {
    if (!tenantId) return;
    await deletePoolConfig(configId, tenantId);
    setPoolConfigs((prev) => prev.filter((c) => c.id !== configId));
  };

  return {
    // Data
    quizData,
    setQuizData,
    savedQuizId,
    quizStatus,
    isPublished,
    activeLesson,

    // Loading states
    isLoading,
    isSaving,
    isPublishing,
    error,

    // UI toggles
    showQuestionModal,
    setShowQuestionModal,
    showAnalytics,
    setShowAnalytics,

    // Actions
    handleSave,
    handlePublishToggle,
    addQuestion,
    updateQuestion,
    removeQuestion,
    addOption,
    updateOption,
    removeOption,
    setCorrectOption,
    updateQuestionType,
    updateQuestionPoints,

    // Phase 33A: Pool config
    poolConfigs,
    isPoolMode,
    isLoadingPoolConfigs,
    poolConfigError,
    addPoolConfig,
    removePoolConfig,
  };
}

export const questionTypeLabels: Record<string, string> = {
  MCQ: "Pilihan Ganda",
  TRUE_FALSE: "Benar/Salah",
  MULTIPLE_SELECT: "Pilih Beberapa",
  SHORT_ANSWER: "Jawaban Singkat",
  ESSAY: "Esai",
};
