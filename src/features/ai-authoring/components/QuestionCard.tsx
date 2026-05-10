import { Edit2, Trash2 } from "lucide-react";

import { cn } from "@/utils/cn";

import type {
  AIAuthoringQuestion,
  AIOpenQuestion,
  AIQuizQuestion,
} from "../types";
import {
  isOpenQuestion,
  isQuizQuestion,
  QUESTION_TYPE_COLORS,
  QUESTION_TYPE_LABELS,
} from "../types";

interface QuestionCardProps {
  question: AIAuthoringQuestion;
  index: number;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (question: AIAuthoringQuestion) => void;
  onDelete: (id: string) => void;
}

const OPTION_LETTERS = ["A", "B", "C", "D", "E"];

function QuizQuestionOptions({ question }: { question: AIQuizQuestion }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-8">
      {question.options.map((opt, j) => (
        <div
          key={j}
          className={cn(
            "px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-2",
            opt.is_correct
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
              : "bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300",
          )}
        >
          <span
            className={cn(
              "w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center shrink-0",
              opt.is_correct
                ? "bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300"
                : "bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-300",
            )}
          >
            {OPTION_LETTERS[j] ?? String(j + 1)}
          </span>
          {opt.text}
        </div>
      ))}
    </div>
  );
}

function OpenQuestionAnswer({ question }: { question: AIOpenQuestion }) {
  return (
    <div className="mt-3 ml-8 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
        Kunci Jawaban / Rubrik:
      </p>
      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
        {question.answer}
      </p>
    </div>
  );
}

export function QuestionCard({
  question,
  index,
  selected,
  onToggleSelect,
  onEdit,
  onDelete,
}: QuestionCardProps) {
  const typeLabel =
    QUESTION_TYPE_LABELS[question.question_type] ?? question.question_type;
  const typeColor =
    QUESTION_TYPE_COLORS[question.question_type] ??
    "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";

  return (
    <div
      className={cn(
        "bg-white dark:bg-slate-800 p-5 rounded-2xl border transition-all",
        selected
          ? "border-blue-400 dark:border-blue-500 shadow-sm shadow-blue-100 dark:shadow-blue-900/20"
          : "border-slate-200 dark:border-slate-700",
      )}
    >
      {/* Header row */}
      <div className="flex items-start gap-3 mb-3">
        {/* Checkbox */}
        <button
          type="button"
          onClick={() => onToggleSelect(question.id)}
          className={cn(
            "mt-0.5 w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors",
            selected
              ? "bg-blue-600 dark:bg-blue-500 border-blue-600 dark:border-blue-500"
              : "border-slate-300 dark:border-slate-500 hover:border-blue-400 dark:hover:border-blue-500",
          )}
          aria-label={selected ? "Batalkan pilihan" : "Pilih soal ini"}
        >
          {selected && (
            <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
              <path
                d="M2 6l3 3 5-5"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>

        {/* Question text & meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-1.5">
            <span className="text-blue-500 dark:text-blue-400 font-bold text-sm shrink-0 mt-0.5">
              {index + 1}.
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm leading-relaxed">
              {question.text}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "inline-block text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full",
                typeColor,
              )}
            >
              {typeLabel}
            </span>
            {question.bloomLevel && (
              <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-800">
                {question.bloomLevel}
              </span>
            )}
            {isQuizQuestion(question) && question.points !== undefined && (
              <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                {question.points} poin
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(question)}
            className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
            aria-label="Edit soal"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(question.id)}
            className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
            aria-label="Hapus soal"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quiz options */}
      {isQuizQuestion(question) && question.options.length > 0 && (
        <QuizQuestionOptions question={question} />
      )}

      {/* Open question answer */}
      {isOpenQuestion(question) && question.answer && (
        <OpenQuestionAnswer question={question} />
      )}

      {/* Explanation (quiz questions only) */}
      {isQuizQuestion(question) && question.explanation && (
        <p className="mt-2 ml-8 text-xs text-slate-400 dark:text-slate-500 italic">
          💡 {question.explanation}
        </p>
      )}
    </div>
  );
}
