import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle,
  HelpCircle,
  Loader2,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";

import { ConfirmDialog, EmptyState } from "@/components/ui";
import { type QuestionBankItem } from "@/features/question-bank/api/questionBankService";
import { QuestionSearchModal } from "@/features/question-bank/components/QuestionSearchModal";
import { type QuestionType } from "@/features/quizzes";
import { type QuizFormData } from "@/features/quizzes/hooks/useQuizForm";
import { QuizStatus } from "@/features/quizzes/types/quizzes.types";
import { useDraftAutosave } from "@/hooks/useDraftAutosave";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/utils/cn";

import { ImportFromQuestionBank } from "./ImportFromQuestionBank";

// ─────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────

const questionTypeLabels: Record<string, string> = {
  MCQ: "Pilihan Ganda",
  TRUE_FALSE: "Benar/Salah",
  MULTIPLE_SELECT: "Pilih Beberapa",
  SHORT_ANSWER: "Jawaban Singkat",
  ESSAY: "Esai",
};

// ─────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────

export interface QuizEditorViewProps {
  methods: UseFormReturn<QuizFormData>;
  editingQuizId: string | null;
  isSaving: boolean;
  isPublished: boolean;
  error: string | null;
  setError: (err: string | null) => void;
  showQuestionModal: boolean;
  setShowQuestionModal: (show: boolean) => void;
  handleSave: (targetStatus?: QuizStatus) => void;
  setView: (view: "list" | "editor") => void;
  loadQuizzes: () => void;
  /** Optional localStorage key override for draft autosave */
  draftKey?: string;
}

// ─────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────

export function QuizEditorView({
  methods,
  editingQuizId,
  isSaving,
  isPublished,
  error,
  setError,
  showQuestionModal,
  setShowQuestionModal,
  handleSave,
  setView,
  loadQuizzes,
  draftKey,
}: QuizEditorViewProps) {
  const { addToast } = useToast();
  const {
    register,
    control,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = methods;
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImportingFromBank, setIsImportingFromBank] = useState(false);
  const [pendingQuestionTypeChange, setPendingQuestionTypeChange] = useState<{
    qIdx: number;
    newType: QuestionType;
  } | null>(null);

  const {
    fields: questionFields,
    append: appendQuestion,
    remove: removeQuestion,
  } = useFieldArray({
    control,
    name: "questions",
  });

  const form = watch();

  // ── Helpers ──────────────────────────────────────────────

  const addQuestion = () => {
    appendQuestion({
      text: "",
      order: questionFields.length + 1,
      question_type: "MCQ",
      points: 1,
      explanation: null,
      options: [
        { text: "Opsi A", is_correct: true },
        { text: "Opsi B", is_correct: false },
      ],
    });
  };

  const applyQuestionType = (qIdx: number, newType: QuestionType) => {
    const q = getValues(`questions.${qIdx}`);
    setValue(`questions.${qIdx}.question_type`, newType);

    if (newType === "TRUE_FALSE") {
      setValue(`questions.${qIdx}.options`, [
        { text: "Benar", is_correct: true },
        { text: "Salah", is_correct: false },
      ]);
    } else if (newType === "SHORT_ANSWER" || newType === "ESSAY") {
      setValue(`questions.${qIdx}.options`, []);
    } else if (q.options.length === 0) {
      setValue(`questions.${qIdx}.options`, [
        { text: "Opsi A", is_correct: true },
        { text: "Opsi B", is_correct: false },
      ]);
    }
  };

  const updateQuestionType = (qIdx: number, newType: QuestionType) => {
    const q = getValues(`questions.${qIdx}`);
    const hasOptions = q.options.some((o) => o.text.trim() !== "");
    const isToTextType = ["SHORT_ANSWER", "ESSAY"].includes(newType);
    const isFromOptionType = ["MCQ", "TRUE_FALSE", "MULTIPLE_SELECT"].includes(
      q.question_type,
    );

    if (isFromOptionType && isToTextType && hasOptions) {
      setPendingQuestionTypeChange({ qIdx, newType });
      return;
    }

    applyQuestionType(qIdx, newType);
  };

  const setCorrectOption = (qIdx: number, oIdx: number) => {
    const q = getValues(`questions.${qIdx}`);
    const options = [...q.options];

    if (q.question_type === "MULTIPLE_SELECT") {
      options[oIdx].is_correct = !options[oIdx].is_correct;
    } else {
      options.forEach((o, i) => {
        o.is_correct = i === oIdx;
      });
    }
    setValue(`questions.${qIdx}.options`, options);
  };

  // ── Import dari Bank Soal ────────────────────────────────

  const handleImportFromBank = async (bankQuestions: QuestionBankItem[]) => {
    if (!editingQuizId) return;
    if (bankQuestions.length === 0) return;

    setIsImportingFromBank(true);
    try {
      const { questionBankService } =
        await import("@/features/question-bank/api/questionBankService");

      const currentQuestions = getValues("questions");
      const existingIds = new Set(
        currentQuestions.map((q) => q.id).filter(Boolean),
      );
      const toImport = bankQuestions.filter((q) => !existingIds.has(q.id));

      if (toImport.length === 0) {
        addToast({
          type: "warning",
          message: "Semua soal yang dipilih sudah ada di kuis ini.",
        });
        setIsImportingFromBank(false);
        return;
      }

      for (let i = 0; i < toImport.length; i++) {
        const q = toImport[i];
        await questionBankService.addQuestionToQuiz(
          q.id,
          editingQuizId,
          1,
          currentQuestions.length + i,
        );
      }

      const newQuestions = toImport.map((q, idx) => ({
        id: q.id,
        text: q.question_text,
        order: currentQuestions.length + idx + 1,
        question_type: q.question_type as QuestionType,
        points: 1,
        explanation: q.explanation || null,
        options: (q.options || []).map((o: any) => ({
          id: o.id,
          text: o.option_text,
          is_correct: o.is_correct,
        })),
      }));

      setValue("questions", [...currentQuestions, ...newQuestions]);

      addToast({
        type: "success",
        message: `${toImport.length} soal berhasil diimpor ke kuis.`,
      });
      setShowImportModal(false);
    } catch (err) {
      addToast({
        type: "error",
        message: err instanceof Error ? err.message : "Gagal mengimpor soal.",
      });
    } finally {
      setIsImportingFromBank(false);
    }
  };

  const draftStorageKey = draftKey ?? `quiz-editor-draft-${form?.id ?? "new"}`;
  const { saveStatusText } = useDraftAutosave({
    key: draftStorageKey,
    data: { quizFormData: form, questions: form.questions },
    debounceMs: 3000,
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 md:px-6 lg:px-8 pb-20">
      {/* Editor Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setView("list");
              loadQuizzes();
            }}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-bold text-xl text-slate-900 dark:text-white">
              {editingQuizId ? "Edit Kuis" : "Buat Kuis Baru"}
            </h2>
            {isPublished && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 mt-0.5">
                <CheckCircle className="w-3 h-3" />
                Diterbitkan
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {saveStatusText && (
            <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              {saveStatusText}
            </span>
          )}
          <button
            onClick={() => handleSave()}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-1.5"
          >
            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <Save className="w-3.5 h-3.5" />
            Simpan Draft
          </button>
          <button
            onClick={() => handleSave(isPublished ? "draft" : "published")}
            disabled={isSaving}
            className={cn(
              "px-4 py-2 text-sm font-bold rounded-xl transition-colors flex items-center gap-1.5",
              isPublished
                ? "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                : "text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm",
            )}
          >
            {isPublished ? "Kembalikan ke Draft" : "Terbitkan Kuis"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-xl flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quiz Settings */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Pengaturan Kuis
        </h3>

        <div className="space-y-4">
          <div>
            <div className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
              Judul Kuis
            </div>
            <input
              id="quiz-title"
              aria-label="Judul Kuis"
              type="text"
              {...register("title")}
              disabled={isPublished}
              className={cn(
                "w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60 text-sm dark:text-slate-100",
                errors.title
                  ? "border-red-500 focus:ring-red-500"
                  : "border-slate-200 dark:border-slate-600",
              )}
              placeholder="Masukkan judul kuis..."
            />
            {errors.title && (
              <p className="text-[10px] text-red-500 mt-1 font-medium">
                {errors.title.message}
              </p>
            )}
          </div>

          <div>
            <div className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
              Instruksi
            </div>
            <textarea
              id="quiz-instructions"
              aria-label="Instruksi"
              {...register("instructions")}
              disabled={isPublished}
              rows={2}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none disabled:opacity-60 text-sm dark:text-slate-100"
              placeholder="Instruksi pengerjaan kuis..."
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <div className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                Mode
              </div>
              <select
                id="quiz-mode"
                aria-label="Mode"
                {...register("mode")}
                disabled={isPublished}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:text-slate-100"
              >
                <option value="practice">Latihan</option>
                <option value="graded">Penilaian</option>
                <option value="exam">Ujian</option>
              </select>
            </div>
            <div>
              <div className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                Waktu (menit)
              </div>
              <input
                id="quiz-time-limit"
                aria-label="Waktu dalam menit"
                type="number"
                {...register("time_limit_minutes", { valueAsNumber: true })}
                disabled={isPublished}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:text-slate-100"
                placeholder="0 = tanpa batas"
              />
              {errors.time_limit_minutes && (
                <p className="text-[10px] text-red-500 mt-1 font-medium">
                  {errors.time_limit_minutes.message}
                </p>
              )}
            </div>
            <div>
              <div className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                Maks. Percobaan
              </div>
              <input
                id="quiz-max-attempts"
                aria-label="Maksimal percobaan"
                type="number"
                {...register("max_attempts", { valueAsNumber: true })}
                disabled={isPublished}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:text-slate-100"
              />
              {errors.max_attempts && (
                <p className="text-[10px] text-red-500 mt-1 font-medium">
                  {errors.max_attempts.message}
                </p>
              )}
            </div>
            <div>
              <div className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                Nilai Lulus (%)
              </div>
              <input
                id="quiz-passing-score"
                aria-label="Nilai lulus persen"
                type="number"
                {...register("passing_score", { valueAsNumber: true })}
                disabled={isPublished}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:text-slate-100"
              />
              {errors.passing_score && (
                <p className="text-[10px] text-red-500 mt-1 font-medium">
                  {errors.passing_score.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {(
              [
                { key: "shuffle_questions" as const, label: "Acak soal" },
                { key: "shuffle_options" as const, label: "Acak opsi" },
                {
                  key: "show_correct_answers" as const,
                  label: "Tampilkan jawaban benar",
                },
              ] as const
            ).map((item) => (
              <label
                key={item.key}
                htmlFor={`quiz-${item.key}`}
                className="flex items-center gap-2 cursor-pointer select-none"
              >
                <input
                  id={`quiz-${item.key}`}
                  type="checkbox"
                  {...register(item.key)}
                  disabled={isPublished}
                  className="w-4 h-4 rounded accent-blue-600"
                />
                <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Questions Section */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Daftar Soal
            <span className="ml-2 text-xs font-normal text-slate-400 dark:text-slate-500">
              ({questionFields.length} soal)
            </span>
          </h3>
          {!isPublished && (
            <div className="flex items-center gap-2">
              {editingQuizId && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowImportModal(true)}
                    className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5" /> Impor dari Bank Soal
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowQuestionModal(true)}
                    className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-600 dark:text-neutral-300 font-bold rounded-lg text-xs flex items-center gap-1 transition-colors"
                  >
                    <Search className="w-3.5 h-3.5" /> Bank Soal
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={addQuestion}
                className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-bold rounded-lg text-xs flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Soal
              </button>
            </div>
          )}
        </div>

        {questionFields.length === 0 ? (
          <EmptyState
            icon={<HelpCircle className="w-8 h-8" />}
            title="Belum ada soal."
            description='Klik "Tambah Soal" untuk mulai membuat pertanyaan.'
            className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl"
          />
        ) : (
          <div className="space-y-4">
            {questionFields.map((field, qIdx) => (
              <div
                key={field.id}
                className="p-4 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 space-y-3"
              >
                {/* Question header */}
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-bold flex items-center justify-center shrink-0">
                    {qIdx + 1}
                  </span>
                  <select
                    {...register(`questions.${qIdx}.question_type`)}
                    onChange={(e) =>
                      updateQuestionType(qIdx, e.target.value as QuestionType)
                    }
                    disabled={isPublished}
                    className="px-2 py-1 text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 font-medium disabled:opacity-60 dark:text-slate-100"
                  >
                    {Object.entries(questionTypeLabels).map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    {...register(`questions.${qIdx}.points`, {
                      valueAsNumber: true,
                    })}
                    disabled={isPublished}
                    className="w-14 px-2 py-1 text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60 dark:text-slate-100"
                    title="Poin"
                  />
                  <span className="text-[10px] text-slate-400">poin</span>
                  <input
                    type="text"
                    {...register(`questions.${qIdx}.text`)}
                    disabled={isPublished}
                    className={cn(
                      "flex-1 px-3 py-1.5 bg-white dark:bg-slate-700 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm disabled:opacity-60 dark:text-slate-100",
                      errors.questions?.[qIdx]?.text
                        ? "border-red-500"
                        : "border-slate-200 dark:border-slate-600",
                    )}
                    placeholder="Tulis pertanyaan di sini..."
                  />
                  {!isPublished && (
                    <button
                      onClick={() => removeQuestion(qIdx)}
                      className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                      aria-label="Hapus pertanyaan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {errors.questions?.[qIdx]?.text && (
                  <p className="pl-8 text-[10px] text-red-500 font-medium">
                    {errors.questions[qIdx]?.text?.message}
                  </p>
                )}

                {/* Options (Internal array handled manually or with another field array) */}
                {watch(`questions.${qIdx}.question_type`) !== "SHORT_ANSWER" &&
                  watch(`questions.${qIdx}.question_type`) !== "ESSAY" && (
                    <div className="pl-8 space-y-2">
                      {watch(`questions.${qIdx}.question_type`) ===
                        "MULTIPLE_SELECT" && (
                        <p className="text-[10px] text-slate-400 italic">
                          Klik untuk toggle jawaban benar (bisa lebih dari 1)
                        </p>
                      )}
                      {watch(`questions.${qIdx}.options`)?.map(
                        (opt: any, oIdx: number) => (
                          <div key={oIdx} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                !isPublished && setCorrectOption(qIdx, oIdx)
                              }
                              disabled={isPublished}
                              aria-label={opt.is_correct ? "Hapus jawaban benar" : "Jadikan jawaban benar"}
                              className={cn(
                                "w-5 h-5 border-2 flex items-center justify-center shrink-0 transition-colors",
                                watch(`questions.${qIdx}.question_type`) ===
                                  "MULTIPLE_SELECT"
                                  ? "rounded"
                                  : "rounded-full",
                                opt.is_correct
                                  ? "border-emerald-500 bg-emerald-500"
                                  : "border-slate-300 bg-white hover:border-emerald-400",
                                isPublished && "cursor-not-allowed",
                              )}
                            >
                              {opt.is_correct && (
                                <svg
                                  className="w-2.5 h-2.5 text-white"
                                  fill="currentColor"
                                  viewBox="0 0 12 12"
                                >
                                  <path d="M10 3L5 8.5 2 5.5l-1 1L5 10.5l6-7-1-0.5z" />
                                </svg>
                              )}
                            </button>
                            <input
                              type="text"
                              {...register(
                                `questions.${qIdx}.options.${oIdx}.text`,
                              )}
                              disabled={
                                isPublished ||
                                watch(`questions.${qIdx}.question_type`) ===
                                  "TRUE_FALSE"
                              }
                              className={cn(
                                "flex-1 px-3 py-1.5 text-sm border rounded-lg outline-none focus:border-blue-400 transition-colors",
                                opt.is_correct
                                  ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400"
                                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700",
                                (isPublished ||
                                  watch(`questions.${qIdx}.question_type`) ===
                                    "TRUE_FALSE") &&
                                  "opacity-60 cursor-not-allowed",
                              )}
                            />
                            {!isPublished &&
                              watch(`questions.${qIdx}.options`)?.length > 2 &&
                              watch(`questions.${qIdx}.question_type`) !==
                                "TRUE_FALSE" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentOptions = getValues(
                                      `questions.${qIdx}.options`,
                                    );
                                    setValue(
                                      `questions.${qIdx}.options`,
                                      currentOptions.filter(
                                        (_: any, i: number) => i !== oIdx,
                                      ),
                                    );
                                  }}
                                  className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                                  aria-label="Hapus opsi"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                          </div>
                        ),
                      )}
                      {!isPublished &&
                        watch(`questions.${qIdx}.question_type`) !==
                          "TRUE_FALSE" && (
                          <button
                            type="button"
                            onClick={() => {
                              const currentOptions =
                                getValues(`questions.${qIdx}.options`) || [];
                              setValue(`questions.${qIdx}.options`, [
                                ...currentOptions,
                                { text: "Opsi Baru", is_correct: false },
                              ]);
                            }}
                            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-1 transition-colors"
                          >
                            <Plus className="w-3 h-3" /> Tambah Opsi
                          </button>
                        )}
                    </div>
                  )}

                {/* Text type hint */}
                {(watch(`questions.${qIdx}.question_type`) === "SHORT_ANSWER" ||
                  watch(`questions.${qIdx}.question_type`) === "ESSAY") && (
                  <div className="pl-8">
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic bg-white dark:bg-slate-700 p-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-600">
                      {watch(`questions.${qIdx}.question_type`) ===
                      "SHORT_ANSWER"
                        ? "🖊️ Siswa akan mengetik jawaban singkat (dinilai manual)"
                        : "📝 Siswa akan menulis esai (dinilai manual)"}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {isPublished && (
          <p className="text-xs text-center text-slate-400 pb-2">
            Kuis sudah diterbitkan. Kembalikan ke Draft untuk mengedit soal.
          </p>
        )}
      </div>

      {/* Question Bank Modals */}
      {editingQuizId && (
        <QuestionSearchModal
          quizId={editingQuizId}
          isOpen={showQuestionModal}
          onClose={() => setShowQuestionModal(false)}
          onAddSuccess={(question) => {
            appendQuestion({
              id: question.id,
              text: question.question_text,
              order: questionFields.length + 1,
              question_type: question.question_type as QuestionType,
              points: 1,
              explanation: question.explanation || null,
              options: (question.options || []).map((o: any) => ({
                text: o.option_text,
                is_correct: o.is_correct,
              })),
            });
            setShowQuestionModal(false);
          }}
        />
      )}

      <ConfirmDialog
        open={pendingQuestionTypeChange !== null}
        title="Ubah tipe soal?"
        description="Mengubah ke tipe jawaban teks akan menghapus semua opsi jawaban pada soal ini."
        confirmLabel="Ubah tipe"
        variant="warning"
        onCancel={() => setPendingQuestionTypeChange(null)}
        onConfirm={() => {
          if (!pendingQuestionTypeChange) return;
          applyQuestionType(
            pendingQuestionTypeChange.qIdx,
            pendingQuestionTypeChange.newType,
          );
          setPendingQuestionTypeChange(null);
        }}
      />

      {editingQuizId && (
        <ImportFromQuestionBank
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImport={handleImportFromBank}
          existingQuestionIds={
            questionFields.map((q) => q.id).filter(Boolean) as string[]
          }
          isImporting={isImportingFromBank}
        />
      )}
    </div>
  );
}
