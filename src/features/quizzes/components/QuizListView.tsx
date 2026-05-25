import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Clock,
  Copy,
  Globe,
  HelpCircle,
  Link as LinkIcon,
  Lock,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { EmptyState } from "@/components/ui";
import { type QuizMode } from "@/features/quizzes";
import { QuizAssignmentStatus } from "@/features/quizzes/components/QuizAssignmentStatus";
import { QuizAssignModal } from "@/features/quizzes/components/QuizAssignModal";
import { QuizStatus } from "@/features/quizzes/types/quizzes.types";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/utils/cn";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

interface QuizListItem {
  id: string;
  title: string;
  status: QuizStatus;
  mode: QuizMode;
  time_limit_minutes: number | null;
  max_attempts: number;
  passing_score: number;
  question_count: number;
  assignment_count?: number;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────

export interface QuizListViewProps {
  quizzes: QuizListItem[];
  isLoading: boolean;
  error: string | null;
  activeTab: "class" | "library";
  setActiveTab: (tab: "class" | "library") => void;
  expandedQuizId: string | null;
  setExpandedQuizId: (id: string | null) => void;
  activeClass: { id: string; name: string; join_code: string } | undefined;
  studentCount: number;
  assignModalQuizId: string | null;
  setAssignModalQuizId: (id: string | null) => void;
  openNewQuiz: () => void;
  openEditQuiz: (quizId: string) => void;
  handleDelete: (quizId: string) => void;
  loadQuizzes: () => void;
}

// ─────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────

export function QuizListView({
  quizzes,
  isLoading,
  error,
  activeTab,
  setActiveTab,
  expandedQuizId,
  setExpandedQuizId,
  activeClass,
  studentCount,
  assignModalQuizId,
  setAssignModalQuizId,
  openNewQuiz,
  openEditQuiz,
  handleDelete,
  loadQuizzes,
}: QuizListViewProps) {
  const { addToast } = useToast();
  const { t } = useTranslation();
  return (
    <div className="max-w-5xl mx-auto space-y-6 px-4 md:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Link
              to="/teacher-dashboard"
              className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            {t("quizList.header.title")}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 ml-9 text-sm">
            {t("quizList.header.subtitle")}
          </p>
        </div>
        <button
          onClick={openNewQuiz}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          {t("quizList.header.createButton")}
        </button>
      </div>

      {/* Class Join Code Header */}
      {activeClass && (
        <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-1">
              {t("quizList.classCard.classLabel")}
            </p>
            <h2 className="text-lg font-bold text-indigo-950 dark:text-indigo-100">
              {activeClass.name}
            </h2>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 bg-white dark:bg-slate-800 py-3 px-4 rounded-xl border border-indigo-100/50 dark:border-slate-700">
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">
                {t("quizList.classCard.students")}
              </p>
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-500" />
                <p className="text-xl font-black text-slate-800 dark:text-white">
                  {studentCount}
                </p>
              </div>
            </div>
            <div className="h-full w-px bg-slate-100 dark:bg-slate-700 hidden sm:block"></div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5">
                {t("quizList.classCard.joinCode")}
              </p>
              <p className="text-xl font-black text-slate-800 dark:text-white tracking-widest">
                {activeClass.join_code}
              </p>
            </div>
            <div className="h-full w-px bg-slate-100 dark:bg-slate-700 hidden sm:block"></div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(activeClass.join_code);
                  addToast({
                    type: "info",
                    message: t("quizList.toasts.codeCopied"),
                  });
                }}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-medium text-xs rounded-lg border border-slate-200 dark:border-slate-600 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                {t("quizList.classCard.copyCode")}
              </button>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/dashboard?join=${activeClass.join_code}`;
                  void navigator.clipboard.writeText(url);
                  addToast({
                    type: "info",
                    message: t("quizList.toasts.linkCopied"),
                  });
                }}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-medium text-xs rounded-lg border border-slate-200 dark:border-slate-600 transition-colors"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                {t("quizList.classCard.copyLink")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div
        className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl"
        role="tablist"
      >
        <button
          role="tab"
          aria-selected={activeTab === "class"}
          onClick={() => setActiveTab("class")}
          className={cn(
            "flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all",
            activeTab === "class"
              ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50",
          )}
        >
          {t("quizList.tabs.class")}
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "library"}
          onClick={() => setActiveTab("library")}
          className={cn(
            "flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all",
            activeTab === "library"
              ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-sm"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50",
          )}
        >
          {t("quizList.tabs.library")}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 text-sm rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Quiz Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 animate-pulse"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 dark:bg-slate-700/60 rounded w-1/3" />
                </div>
                <div className="h-6 w-16 bg-slate-100 dark:bg-slate-700/60 rounded-full" />
              </div>
              <div className="flex items-center gap-4 mt-4">
                <div className="h-3 bg-slate-100 dark:bg-slate-700/60 rounded w-14" />
                <div className="h-3 bg-slate-100 dark:bg-slate-700/60 rounded w-14" />
                <div className="h-3 bg-slate-100 dark:bg-slate-700/60 rounded w-14" />
              </div>
            </div>
          ))}
        </div>
      ) : quizzes.length === 0 ? (
        <EmptyState
          icon={<HelpCircle className="w-8 h-8" />}
          title={t("quizList.empty.title")}
          description={t("quizList.empty.description")}
          action={{ label: "Buat Kuis Baru", onClick: openNewQuiz }}
          className="bg-white dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quizzes.map((quiz) => (
            <div
              key={quiz.id}
              role="button"
              tabIndex={0}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group cursor-pointer"
              onClick={() => openEditQuiz(quiz.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") openEditQuiz(quiz.id);
              }}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 truncate">
                    {quiz.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                        quiz.status === "published"
                          ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                          : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
                      )}
                    >
                      {quiz.status === "published" ? (
                        <Globe className="w-2.5 h-2.5" />
                      ) : (
                        <Lock className="w-2.5 h-2.5" />
                      )}
                      {quiz.status === "published"
                        ? t("quizList.status.published")
                        : t("quizList.status.draft")}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                      {t(`quizList.modes.${quiz.mode}`, {
                        defaultValue: quiz.mode,
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {activeTab === "library" && quiz.status === "published" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAssignModalQuizId(quiz.id);
                      }}
                      className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                      title={t("quizList.actions.assignToClass")}
                    >
                      <Calendar className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditQuiz(quiz.id);
                    }}
                    className="p-2 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title={t("quizList.actions.edit")}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {quiz.status === "draft" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(quiz.id);
                      }}
                      className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title={t("quizList.actions.delete")}
                      aria-label={t("quizList.actions.delete")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  {t("quizList.metrics.questions").replace(
                    "__COUNT__",
                    String(quiz.question_count),
                  )}
                </span>
                {quiz.time_limit_minutes && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {t("quizList.metrics.minutes").replace(
                      "__COUNT__",
                      String(quiz.time_limit_minutes),
                    )}
                  </span>
                )}
                <span>
                  {t("quizList.metrics.maxAttempts").replace(
                    "__COUNT__",
                    String(quiz.max_attempts),
                  )}
                </span>
                <span>
                  {t("quizList.metrics.passingScore").replace(
                    "__SCORE__",
                    String(quiz.passing_score),
                  )}
                </span>
              </div>

              {activeTab === "library" && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedQuizId(
                        expandedQuizId === quiz.id ? null : quiz.id,
                      );
                    }}
                    className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center justify-between w-full"
                  >
                    <span>
                      {t("quizList.assignmentStatus.title").replace(
                        "__COUNT__",
                        String(quiz.assignment_count || 0),
                      )}
                    </span>
                    <ArrowLeft
                      className={cn(
                        "w-3 h-3 transition-transform",
                        expandedQuizId === quiz.id ? "rotate-90" : "-rotate-90",
                      )}
                    />
                  </button>

                  {expandedQuizId === quiz.id && (
                    <div
                      role="presentation"
                      className="mt-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <QuizAssignmentStatus
                        quizId={quiz.id}
                        onAssignClick={() => setAssignModalQuizId(quiz.id)}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {assignModalQuizId && (
        <QuizAssignModal
          quizId={assignModalQuizId}
          isOpen={true}
          onClose={() => setAssignModalQuizId(null)}
          onSuccess={() => {
            setAssignModalQuizId(null);
            loadQuizzes();
          }}
        />
      )}
    </div>
  );
}
