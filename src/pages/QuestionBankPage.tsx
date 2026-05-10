import { useVirtualizer } from "@tanstack/react-virtual";
import { BookOpen, Filter, Loader2, Plus, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { ConfirmDialog, useToast } from "@/components/ui";
import {
  QuestionBankItem,
  questionBankService,
} from "@/features/question-bank/api/questionBankService";
import { QuestionBankExportImport } from "@/features/question-bank/components/QuestionBankExportImport";
import { QuestionBankSkeleton } from "@/features/question-bank/components/QuestionBankSkeleton";
import { QuestionCard } from "@/features/question-bank/components/QuestionCard";
import { QuestionEditor } from "@/features/question-bank/components/QuestionEditor";
import { usePageTitle } from "@/hooks/usePageTitle";
import { logger } from "@/utils/logger";

export function QuestionBankPage() {
  const { t } = useTranslation();
  const addToast = useToast((s) => s.addToast);
  usePageTitle(t("questionBank.pageTitle"));
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Editor modal state
  const [showEditor, setShowEditor] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<
    string | undefined
  >(undefined);

  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: questions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    void loadQuestions();
  }, [debouncedSearchTerm, typeFilter]);
  /* eslint-enable react-hooks/exhaustive-deps */

  // Handle debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const data = await questionBankService.searchQuestions({
        query: debouncedSearchTerm || undefined,
        questionType: typeFilter || undefined,
        limit: 50,
      });
      setQuestions(data);
    } catch (error) {
      if (import.meta.env.DEV) logger.error("Failed to load questions:", error);
      addToast({ type: "error", message: t("questionBank.toast.loadFail") });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id: string) => {
    setEditingQuestionId(id);
    setShowEditor(true);
  };

  const handleCreateNew = () => {
    setEditingQuestionId(undefined);
    setShowEditor(true);
  };

  const handleDelete = (id: string) => {
    setPendingDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;

    try {
      await questionBankService.archiveQuestion(pendingDeleteId);
      setQuestions((q) => q.filter((item) => item.id !== pendingDeleteId));
      setPendingDeleteId(null);
    } catch (error) {
      if (import.meta.env.DEV)
        logger.error("Failed to delete question:", error);
      addToast({ type: "error", message: t("questionBank.toast.deleteFail") });
    }
  };

  if (loading && questions.length === 0) {
    return <QuestionBankSkeleton />;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <ConfirmDialog
        open={pendingDeleteId !== null}
        title={t("questionBank.deleteConfirm")}
        confirmLabel={t("common.delete")}
        variant="danger"
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={confirmDelete}
      />

      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            {t("questionBank.header.title")}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {t("questionBank.header.subtitle")}
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="flex justify-center items-center space-x-2 px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span>{t("questionBank.header.createNew")}</span>
        </button>
      </div>

      <div className="mb-6">
        <QuestionBankExportImport />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mb-6 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              aria-label={t("questionBank.search.placeholder")}
              placeholder={t("questionBank.search.placeholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>

          <div className="flex gap-4">
            <div className="w-48 relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                aria-label={t("questionBank.filter.all")}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full pl-9 pr-8 py-2 border dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
              >
                <option value="">{t("questionBank.filter.all")}</option>
                <option value="MCQ">{t("questionBank.filter.mcq")}</option>
                <option value="TRUE_FALSE">
                  {t("questionBank.filter.trueFalse")}
                </option>
                <option value="SHORT_ANSWER">
                  {t("questionBank.filter.shortAnswer")}
                </option>
                <option value="ESSAY">{t("questionBank.filter.essay")}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-4" />
          <p className="text-slate-500">{t("questionBank.loading")}</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm text-center px-4">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700/50 rounded-full flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">
            {t("questionBank.empty.title")}
          </h3>
          <p className="text-slate-500 max-w-sm">
            {t("questionBank.empty.subtitle")}
          </p>
        </div>
      ) : (
        <div
          ref={parentRef}
          className="overflow-auto"
          style={{ maxHeight: "70vh" }}
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((vRow) => {
              const q = questions[vRow.index];
              return (
                <div
                  key={q.id}
                  ref={virtualizer.measureElement}
                  data-index={vRow.index}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${vRow.start}px)`,
                  }}
                >
                  <div className="pb-4">
                    <QuestionCard
                      question={q}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <QuestionEditor
        isOpen={showEditor}
        onClose={() => setShowEditor(false)}
        questionId={editingQuestionId}
        onSaveSuccess={loadQuestions}
      />
    </div>
  );
}
