import { GitBranch, Loader2, Plus } from "lucide-react";
import { useState } from "react";

import { ConfirmDialog } from "@/components/ui";

import {
  useCreatePathRule,
  useDeletePathRule,
  usePathRules,
  useUpdatePathRule,
} from "../queries/adaptivePathQueries";
import type { LessonNode, PathRule, PathRuleInsert } from "../types";
import { PathRuleCard } from "./PathRuleCard";
import { PathRuleEditor } from "./PathRuleEditor";

interface PathRuleListProps {
  courseId: string;
  tenantId: string;
  /** Optional: flat list of lessons for this course to show titles */
  lessons?: LessonNode[];
}

export function PathRuleList({
  courseId,
  tenantId,
  lessons = [],
}: PathRuleListProps) {
  const { data: rules, isLoading, isError } = usePathRules(courseId, tenantId);
  const createMutation = useCreatePathRule();
  const updateMutation = useUpdatePathRule();
  const deleteMutation = useDeletePathRule();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PathRule | undefined>(
    undefined,
  );
  const [pendingDeleteRule, setPendingDeleteRule] = useState<PathRule | null>(
    null,
  );

  const getLessonTitle = (lessonId: string) => {
    const lesson = lessons.find((l) => l.id === lessonId);
    return lesson?.title ?? lessonId;
  };

  const handleSave = (ruleData: PathRuleInsert) => {
    if (editingRule) {
      updateMutation.mutate(
        { ruleId: editingRule.id, data: ruleData, tenantId },
        {
          onSuccess: () => {
            setEditorOpen(false);
            setEditingRule(undefined);
          },
        },
      );
    } else {
      createMutation.mutate(
        { rule: { ...ruleData, course_id: courseId }, tenantId },
        {
          onSuccess: () => {
            setEditorOpen(false);
            setEditingRule(undefined);
          },
        },
      );
    }
  };

  const handleEdit = (rule: PathRule) => {
    setEditingRule(rule);
    setEditorOpen(true);
  };

  const handleDelete = (rule: PathRule) => {
    setPendingDeleteRule(rule);
  };

  const confirmDeleteRule = () => {
    if (!pendingDeleteRule) return;
    deleteMutation.mutate(
      { ruleId: pendingDeleteRule.id, tenantId, courseId },
      { onSettled: () => setPendingDeleteRule(null) },
    );
  };

  const handleToggleActive = (rule: PathRule) => {
    updateMutation.mutate({
      ruleId: rule.id,
      data: { is_active: !rule.is_active },
      tenantId,
    });
  };

  const handleAddNew = () => {
    setEditingRule(undefined);
    setEditorOpen(true);
  };

  const isMutating =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400 py-6 text-center">
        Gagal memuat aturan jalur. Silakan muat ulang halaman.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <ConfirmDialog
        open={pendingDeleteRule !== null}
        title="Hapus aturan alur?"
        description={`Aturan "${pendingDeleteRule?.label || "ini"}" akan dihapus. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onCancel={() => setPendingDeleteRule(null)}
        onConfirm={confirmDeleteRule}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
            Aturan Alur Pembelajaran
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Tentukan jalur belajar adaptif berdasarkan performa siswa.
          </p>
        </div>
        <button
          onClick={handleAddNew}
          disabled={isMutating}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-xl transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Tambah Aturan
        </button>
      </div>

      {/* Empty state */}
      {(!rules || rules.length === 0) && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
            <GitBranch className="w-6 h-6 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
            Belum ada aturan jalur
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs">
            Tambahkan aturan untuk mengarahkan siswa ke materi yang sesuai
            berdasarkan performa mereka.
          </p>
        </div>
      )}

      {/* Rule cards */}
      {rules && rules.length > 0 && (
        <div className="space-y-3">
          {rules.map((rule) => (
            <PathRuleCard
              key={rule.id}
              rule={rule}
              sourceLessonTitle={getLessonTitle(rule.source_lesson_id)}
              targetLessonTitle={getLessonTitle(rule.target_lesson_id)}
              onEdit={() => handleEdit(rule)}
              onDelete={() => handleDelete(rule)}
              onToggleActive={() => handleToggleActive(rule)}
            />
          ))}
        </div>
      )}

      {/* Editor modal */}
      {editorOpen && (
        <PathRuleEditor
          courseId={courseId}
          lessons={lessons}
          rule={editingRule}
          onSave={handleSave}
          onClose={() => {
            setEditorOpen(false);
            setEditingRule(undefined);
          }}
          isSaving={isMutating}
        />
      )}
    </div>
  );
}
