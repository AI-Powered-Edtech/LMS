import { Flag } from "lucide-react";

import { SubmitAnswer } from "@/features/quizzes";
import { cn } from "@/utils/cn";

import type {
  QuizAttemptQuestion,
  QuizOptionSnapshot,
} from "../../types/quizzes.types";

interface QuizBodyProps {
  question: QuizAttemptQuestion;
  questionType: string;
  currentAnswer: SubmitAnswer | undefined;
  isFlagged: boolean;
  onToggleFlag: (id: string) => void;
  onAnswer: (questionId: string, answer: SubmitAnswer) => void;
}

export function QuizBody({
  question,
  questionType,
  currentAnswer,
  isFlagged,
  onToggleFlag,
  onAnswer,
}: QuizBodyProps) {
  // Use options from question_snapshot if available (shuffled order)
  // Otherwise fall back to quiz_options
  const options =
    question.question_snapshot?.options || question.quiz_options || [];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 md:p-8 relative">
      <button
        type="button"
        onClick={() => onToggleFlag(question.question_id)}
        aria-label={isFlagged ? "Hapus tanda" : "Tandai soal ini"}
        aria-pressed={isFlagged}
        className={cn(
          "absolute top-6 right-6 p-2 rounded-xl border transition-colors flex items-center gap-2 text-sm font-bold",
          isFlagged
            ? "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700 text-yellow-700 dark:text-yellow-400"
            : "bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-600",
        )}
      >
        <Flag className={cn("w-4 h-4", isFlagged && "fill-current")} />
        {isFlagged ? "Ditandai" : "Tandai"}
      </button>

      {/* Question Type Badge */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className={cn(
            "inline-block px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider",
            questionType === "ESSAY"
              ? "bg-purple-100 text-purple-700"
              : questionType === "SHORT_ANSWER"
                ? "bg-amber-100 text-amber-700"
                : questionType === "MULTIPLE_SELECT"
                  ? "bg-cyan-100 text-cyan-700"
                  : questionType === "TRUE_FALSE"
                    ? "bg-teal-100 text-teal-700"
                    : "bg-blue-100 text-blue-700",
          )}
        >
          {questionType === "MCQ"
            ? "Pilihan Ganda"
            : questionType === "TRUE_FALSE"
              ? "Benar / Salah"
              : questionType === "MULTIPLE_SELECT"
                ? "Pilihan Banyak"
                : questionType === "SHORT_ANSWER"
                  ? "Jawaban Singkat"
                  : questionType === "ESSAY"
                    ? "Esai"
                    : "Soal"}
        </span>
        {question.max_points > 0 && (
          <span className="text-xs font-bold text-slate-400">
            {question.max_points} poin
          </span>
        )}
      </div>

      <h3 className="text-xl font-medium text-slate-900 dark:text-slate-100 mb-8 leading-relaxed mt-4 pr-24">
        {question.text}
      </h3>

      {/* MCQ / TRUE_FALSE — Radio Buttons */}
      {(questionType === "MCQ" || questionType === "TRUE_FALSE") && (
        <div
          className="space-y-3"
          role="radiogroup"
          aria-label="Pilihan jawaban"
        >
          {options.map((option: QuizOptionSnapshot) => {
            const isSelected =
              currentAnswer?.selected_option_ids?.includes(option.id) ?? false;
            return (
              <button
                type="button"
                key={option.id}
                role="radio"
                aria-checked={isSelected}
                onClick={() =>
                  onAnswer(question.question_id, {
                    question_id: question.question_id,
                    selected_option_ids: [option.id],
                  })
                }
                className={cn(
                  "w-full flex items-center space-x-4 p-4 rounded-2xl border-2 text-left transition-all duration-150",
                  isSelected
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500 text-blue-900 dark:text-blue-100 shadow-sm"
                    : "border-slate-100 dark:border-slate-600 hover:border-blue-200 dark:hover:border-blue-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200",
                )}
              >
                <div
                  className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                    isSelected
                      ? "border-blue-500 dark:border-blue-400"
                      : "border-slate-300 dark:border-slate-500",
                  )}
                >
                  {isSelected && (
                    <div className="w-3 h-3 bg-blue-500 dark:bg-blue-400 rounded-full" />
                  )}
                </div>
                <span className="font-medium text-base">{option.text}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* MULTIPLE_SELECT — Checkboxes */}
      {questionType === "MULTIPLE_SELECT" && (
        <div
          className="space-y-3"
          role="group"
          aria-label="Pilihan jawaban (pilih beberapa)"
        >
          <p className="text-sm text-slate-500 -mt-4 mb-4 italic">
            Pilih semua jawaban yang benar
          </p>
          {options.map((option: QuizOptionSnapshot) => {
            const currentIds = currentAnswer?.selected_option_ids || [];
            const isSelected = currentIds.includes(option.id);
            return (
              <button
                type="button"
                key={option.id}
                role="checkbox"
                aria-checked={isSelected}
                onClick={() => {
                  const newIds = isSelected
                    ? currentIds.filter((id: string) => id !== option.id)
                    : [...currentIds, option.id];
                  onAnswer(question.question_id, {
                    question_id: question.question_id,
                    selected_option_ids: newIds,
                  });
                }}
                className={cn(
                  "w-full flex items-center space-x-4 p-4 rounded-2xl border-2 text-left transition-all duration-150",
                  isSelected
                    ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 dark:border-cyan-500 text-cyan-900 dark:text-cyan-100 shadow-sm"
                    : "border-slate-100 dark:border-slate-600 hover:border-cyan-200 dark:hover:border-cyan-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200",
                )}
              >
                <div
                  className={cn(
                    "w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors",
                    isSelected
                      ? "border-cyan-500 dark:border-cyan-400 bg-cyan-500 dark:bg-cyan-500"
                      : "border-slate-300 dark:border-slate-500",
                  )}
                >
                  {isSelected && (
                    <svg
                      className="w-4 h-4 text-white"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
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
      {questionType === "SHORT_ANSWER" && (
        <div>
          <input
            aria-label="Jawaban singkat"
            type="text"
            value={currentAnswer?.text_answer || ""}
            onChange={(e) =>
              onAnswer(question.question_id, {
                question_id: question.question_id,
                text_answer: e.target.value,
                selected_option_ids: [],
              })
            }
            placeholder="Ketik jawaban singkat Anda..."
            className="w-full px-5 py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 outline-none text-base font-medium text-slate-800 placeholder-slate-400 dark:placeholder-slate-500 transition-all"
            autoFocus
          />
        </div>
      )}

      {/* ESSAY — Textarea */}
      {questionType === "ESSAY" && (
        <div>
          <textarea
            aria-label="Jawaban esai"
            value={currentAnswer?.text_answer || ""}
            onChange={(e) =>
              onAnswer(question.question_id, {
                question_id: question.question_id,
                text_answer: e.target.value,
                selected_option_ids: [],
              })
            }
            placeholder="Tulis jawaban esai Anda di sini..."
            rows={8}
            className="w-full px-5 py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-800 outline-none text-base font-medium text-slate-800 placeholder-slate-400 dark:placeholder-slate-500 transition-all resize-y min-h-[150px]"
            autoFocus
          />
          <p className="text-xs text-slate-400 mt-2 text-right">
            {(currentAnswer?.text_answer || "").length} karakter
          </p>
        </div>
      )}
    </div>
  );
}
