import {
  BookOpen,
  FileText,
  LayoutList,
  Loader2,
  RefreshCw,
  Sparkles,
  XCircle,
} from "lucide-react";

import { useBuilder } from "@/contexts/BuilderContext";
import { useToast } from "@/hooks/useToast";

import {
  useArtifactHistory,
  useDismissArtifact,
} from "../queries/aiBuilderCopilotQueries";
import { useBuilderAICopilotStore } from "../store/builderAICopilot.store";
import type { AIBuilderArtifact, ArtifactKind, CopilotTab } from "../types";
import { ARTIFACT_KIND_LABELS } from "../types";
import { ArtifactStatusBadge } from "./shared/ArtifactStatusBadge";

const KIND_ICONS: Record<ArtifactKind, typeof Sparkles> = {
  outline: LayoutList,
  lesson_draft: FileText,
  assessment: BookOpen,
  transform: RefreshCw,
};

const KIND_TO_TAB: Record<ArtifactKind, CopilotTab> = {
  outline: "outline",
  lesson_draft: "lesson_draft",
  assessment: "assessment",
  transform: "improve",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HistoryTab() {
  const { state, actions } = useBuilder();
  const addToast = useToast((s) => s.addToast);
  const setActiveTab = useBuilderAICopilotStore((s) => s.setActiveTab);
  const setHydratedArtifact = useBuilderAICopilotStore(
    (s) => s.setHydratedArtifact,
  );

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useArtifactHistory(state.courseId);
  const dismissMutation = useDismissArtifact();

  const artifacts =
    (data?.pages as unknown as Array<{ items: AIBuilderArtifact[] }>)?.flatMap(
      (page) => page.items,
    ) ?? [];

  const handleDismiss = async (artifact: AIBuilderArtifact) => {
    if (!state.courseId) return;
    try {
      await dismissMutation.mutateAsync({
        artifactId: artifact.id,
        courseId: state.courseId,
      });
      addToast({ type: "success", message: "Artefak diabaikan." });
    } catch {
      addToast({ type: "error", message: "Gagal mengabaikan artefak." });
    }
  };

  const handleReload = async (artifact: AIBuilderArtifact) => {
    const tab = KIND_TO_TAB[artifact.artifact_kind];
    const promptContext =
      artifact.prompt_config && typeof artifact.prompt_config === "object"
        ? (artifact.prompt_config.context as
            | { lesson_id?: string; block_id?: string }
            | undefined)
        : undefined;

    try {
      if (artifact.target_type === "lesson" && artifact.target_id) {
        await actions.selectLesson(artifact.target_id);
      }

      if (artifact.target_type === "block") {
        const lessonId = promptContext?.lesson_id;
        if (lessonId) {
          await actions.selectLesson(lessonId);
        }
        if (artifact.target_id) {
          actions.selectBlock(artifact.target_id);
        }
      }

      setHydratedArtifact(artifact);
      setActiveTab(tab);
    } catch (err) {
      addToast({
        type: "error",
        message:
          err instanceof Error ? err.message : "Gagal memuat ulang artefak.",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!artifacts || artifacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
          <Sparkles className="w-7 h-7 text-slate-300 dark:text-slate-600" />
        </div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Belum ada riwayat AI
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          Hasilkan konten dari tab lain untuk melihat riwayat di sini.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {artifacts.map((artifact) => {
          const kind = artifact.artifact_kind as ArtifactKind;
          const Icon = KIND_ICONS[kind];
          return (
            <div
              key={artifact.id}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg shrink-0">
                  <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      {ARTIFACT_KIND_LABELS[kind]}
                    </span>
                    <ArtifactStatusBadge status={artifact.status} />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {formatDate(artifact.created_at)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  onClick={() => handleReload(artifact)}
                  className="flex-1 py-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-colors"
                >
                  Muat Ulang
                </button>
                {artifact.status === "generated" && (
                  <button
                    onClick={() => handleDismiss(artifact)}
                    disabled={dismissMutation.isPending}
                    className="flex-1 py-1.5 text-[10px] font-bold text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <XCircle className="w-3 h-3" />
                    Abaikan
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {hasNextPage && (
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="w-full py-2.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Memuat...
              </>
            ) : (
              "Muat lebih banyak"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
