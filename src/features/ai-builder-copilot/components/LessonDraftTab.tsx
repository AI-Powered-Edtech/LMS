import { Check, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useBuilder } from "@/contexts/BuilderContext";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/utils/cn";

import {
  useApplyLessonDraft,
  useGenerateLessonDraft,
} from "../queries/aiBuilderCopilotQueries";
import { useBuilderAICopilotStore } from "../store/builderAICopilot.store";
import type { AssessmentSuggestions, LessonDraftBlock } from "../types";
import { BlockPreviewCard } from "./shared/BlockPreviewCard";
import { CopilotLoadingState } from "./shared/CopilotLoadingState";

export function LessonDraftTab() {
  const { state, actions } = useBuilder();
  const addToast = useToast((s) => s.addToast);

  const generateDraft = useGenerateLessonDraft();
  const applyDraft = useApplyLessonDraft();
  const hydratedArtifact = useBuilderAICopilotStore((s) => s.hydratedArtifact);

  // Form state
  const [subject, setSubject] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");

  // Preview state
  const [blocks, setBlocks] = useState<LessonDraftBlock[]>([]);
  const [assessmentSuggestions, setAssessmentSuggestions] = useState<
    AssessmentSuggestions | undefined
  >();
  const [artifactId, setArtifactId] = useState<string | null>(null);
  const [selectedBlocks, setSelectedBlocks] = useState<Set<number>>(new Set());
  const [includeAssignment, setIncludeAssignment] = useState(false);

  // Bolt Performance: Replaced slow `.flatMap().find()` with `useMemo` & early return `for...of` loop
  const lessonTitle = useMemo(() => {
    const activeId = state.activeLesson?.id;
    if (!activeId) return "";
    for (const module of state.modules) {
      for (const lesson of module.lessons) {
        if (lesson.id === activeId) {
          return lesson.title;
        }
      }
    }
    return "";
  }, [state.modules, state.activeLesson?.id]);

  useEffect(() => {
    if (
      !hydratedArtifact ||
      !["lesson_draft", "assessment"].includes(hydratedArtifact.artifact_kind)
    ) {
      return;
    }

    const hydratedBlocks = Array.isArray(hydratedArtifact.output.blocks)
      ? (hydratedArtifact.output.blocks as LessonDraftBlock[])
      : [];
    const hydratedAssessment =
      hydratedArtifact.output.assessment_suggestions &&
      typeof hydratedArtifact.output.assessment_suggestions === "object"
        ? (hydratedArtifact.output
            .assessment_suggestions as AssessmentSuggestions)
        : undefined;

    setBlocks(hydratedBlocks);
    setAssessmentSuggestions(hydratedAssessment);
    setArtifactId(hydratedArtifact.id);
    setSelectedBlocks(new Set(hydratedBlocks.map((_, index) => index)));
    setIncludeAssignment(false);
  }, [hydratedArtifact]);

  if (!state.activeLesson) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Pilih pelajaran terlebih dahulu untuk membuat draft konten.
        </p>
      </div>
    );
  }

  const handleGenerate = async () => {
    if (!state.activeLesson || !state.courseId) return;

    try {
      const result = await generateDraft.mutateAsync({
        lesson_id: state.activeLesson.id,
        course_id: state.courseId,
        subject: subject || undefined,
        grade_level: gradeLevel || undefined,
      });

      setBlocks(result.draft.blocks);
      setAssessmentSuggestions(result.draft.assessment_suggestions);
      setArtifactId(result.artifact_id);
      setSelectedBlocks(new Set(result.draft.blocks.map((_, i) => i)));
      setIncludeAssignment(false);
    } catch (err) {
      addToast({
        type: "error",
        message:
          err instanceof Error ? err.message : "Gagal menghasilkan draft.",
      });
    }
  };

  const handleApply = async () => {
    if (!artifactId || !state.activeLesson || !state.courseId) return;

    const selected = blocks.filter((_, i) => selectedBlocks.has(i));

    try {
      await applyDraft.mutateAsync({
        artifactId,
        courseId: state.courseId,
        lessonId: state.activeLesson.id,
        selectedBlocks: selected.map((b) => ({
          type: b.type,
          title: b.title,
          content: b.content,
          metadata: {},
        })),
        assignmentPayload:
          includeAssignment && assessmentSuggestions?.assignment_title
            ? {
                title: assessmentSuggestions.assignment_title,
                instructions:
                  assessmentSuggestions.assignment_instructions ?? "",
                max_points: 100,
              }
            : null,
      });

      // Refresh blocks in builder
      actions.selectLesson(state.activeLesson.id);

      addToast({
        type: "success",
        message: `${selected.length} blok konten berhasil ditambahkan.`,
      });

      // Reset
      setBlocks([]);
      setArtifactId(null);
      setSelectedBlocks(new Set());
    } catch (err) {
      addToast({
        type: "error",
        message: err instanceof Error ? err.message : "Gagal menerapkan draft.",
      });
    }
  };

  const toggleBlock = (index: number) => {
    setSelectedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  if (generateDraft.isPending) {
    return <CopilotLoadingState message="Menghasilkan draft pelajaran..." />;
  }

  // Preview mode
  if (blocks.length > 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
            Pratinjau Draft — {lessonTitle}
          </h3>

          {blocks.map((block, i) => (
            <BlockPreviewCard
              key={i}
              block={block}
              index={i}
              selected={selectedBlocks.has(i)}
              onToggle={() => toggleBlock(i)}
            />
          ))}

          {assessmentSuggestions?.assignment_title && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 p-3">
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={includeAssignment}
                  onChange={(e) => setIncludeAssignment(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                    Saran Tugas: {assessmentSuggestions.assignment_title}
                  </span>
                  {assessmentSuggestions.assignment_instructions && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 line-clamp-2">
                      {assessmentSuggestions.assignment_instructions}
                    </p>
                  )}
                </div>
              </label>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 p-4 space-y-2">
          <button
            onClick={handleApply}
            disabled={selectedBlocks.size === 0 || applyDraft.isPending}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            {applyDraft.isPending
              ? "Menerapkan..."
              : `Terapkan ${selectedBlocks.size} Blok`}
          </button>
          <button
            onClick={() => {
              setBlocks([]);
              setArtifactId(null);
            }}
            className="w-full py-2 text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            Buat Ulang
          </button>
        </div>
      </div>
    );
  }

  // Form mode
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded-xl p-3">
          <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
            Pelajaran Aktif
          </span>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mt-0.5">
            {lessonTitle}
          </p>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Hasilkan draft konten teks untuk pelajaran ini. AI akan membuat
          blok-blok terstruktur berdasarkan konteks pelajaran.
        </p>

        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
            Mata Pelajaran
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Opsional"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
            Tingkat/Kelas
          </label>
          <input
            type="text"
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
            placeholder="Opsional"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700 p-4">
        <button
          onClick={handleGenerate}
          className={cn(
            "w-full py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2",
            "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30",
          )}
        >
          <Sparkles className="w-4 h-4" />
          Hasilkan Draft
        </button>
      </div>
    </div>
  );
}
