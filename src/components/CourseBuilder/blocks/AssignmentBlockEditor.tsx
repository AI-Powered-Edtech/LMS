import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  FileText,
  Loader2,
} from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useBuilder } from "@/contexts/BuilderContext";
import {
  type AssignmentBlockData,
  builderAssignmentService,
} from "@/features/courses/api/builder/assignmentBuilderService";
import { cn } from "@/utils/cn";

export function AssignmentBlockEditor({
  blockId: _blockId,
}: {
  blockId: string;
}) {
  const { tenantId } = useAuth();
  const { state } = useBuilder();
  const activeLesson = state.modules
    .flatMap((m) => m.lessons)
    .find((l) => l.id === state.activeLesson?.id);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAssignmentId, setSavedAssignmentId] = useState<
    string | undefined
  >(undefined);

  const [assignmentData, setAssignmentData] = useState<AssignmentBlockData>({
    title: "Tugas Baru",
    instructions: "",
    max_points: 100,
    max_attempts: 1,
    is_published: false,
    due_date: null,
  });

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!activeLesson) return;
    async function load() {
      try {
        const data = await builderAssignmentService.getAssignmentByLesson(
          activeLesson!.id,
          tenantId!,
        );
        if (data) {
          setSavedAssignmentId(data.id);
          setAssignmentData({
            id: data.id,
            title: data.title || "",
            instructions: data.instructions || "",
            max_points: data.max_points || 100,
            max_attempts: data.max_attempts || 1,
            is_published: data.is_published || false,
            due_date: data.due_date
              ? new Date(data.due_date).toISOString().split("T")[0]
              : null,
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

  const handleSave = async () => {
    if (!activeLesson) return;
    setIsSaving(true);
    setError(null);
    try {
      const payload: AssignmentBlockData = {
        ...assignmentData,
        id: savedAssignmentId,
      };
      const result = await builderAssignmentService.saveAssignmentData(
        activeLesson.id,
        state.courseId ?? "",
        activeLesson.tenantId,
        payload,
      );
      setSavedAssignmentId(result.id);
      setAssignmentData((prev) => ({ ...prev, id: result.id }));
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Kesalahan tidak diketahui",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm">Memuat data tugas...</span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 p-6 bg-white rounded-[24px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-[20px] bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 shadow-inner">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">
              Pengaturan Tugas
            </h3>
            <div
              className={cn(
                "inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.1em] px-3 py-1 rounded-full mt-1 shadow-sm",
                assignmentData.is_published
                  ? "bg-indigo-500 text-white shadow-indigo-100"
                  : "bg-slate-200 text-slate-500",
              )}
            >
              {assignmentData.is_published ? (
                <CheckCircle className="w-3.5 h-3.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5" />
              )}
              {assignmentData.is_published ? "Terbit" : "Draft"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-3 mr-4 border-r border-slate-100 pr-4">
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
              STATUS:
            </span>
            <button
              role="switch"
              aria-checked={assignmentData.is_published}
              aria-label="Publikasi tugas"
              onClick={() =>
                setAssignmentData({
                  ...assignmentData,
                  is_published: !assignmentData.is_published,
                })
              }
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-all focus:outline-none ring-offset-2 focus:ring-2 focus:ring-indigo-100",
                assignmentData.is_published ? "bg-indigo-500" : "bg-slate-200",
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm",
                  assignmentData.is_published
                    ? "translate-x-6"
                    : "translate-x-1",
                )}
              />
            </button>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 text-xs font-black text-white bg-slate-900 hover:bg-black rounded-xl shadow-xl shadow-slate-100 transition-all flex items-center gap-2 group disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            )}
            <span aria-live="polite">
              {isSaving ? "Menyimpan..." : "SIMPAN PERUBAHAN"}
            </span>
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-start gap-2"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Assignment Settings */}
      <div className="grid grid-cols-1 gap-6 p-8 bg-slate-50/50 rounded-[32px] border border-slate-200/50">
        <div>
          <label
            htmlFor="assignment-title"
            className="block text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-2 px-1"
          >
            Judul Tugas
            <input
              id="assignment-title"
              type="text"
              value={assignmentData.title}
              onChange={(e) =>
                setAssignmentData({ ...assignmentData, title: e.target.value })
              }
              className="mt-2 block w-full px-5 py-3 bg-white border border-slate-200 rounded-[18px] focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-400 shadow-sm normal-case tracking-normal"
              placeholder="Masukkan judul tugas..."
              aria-label="Judul Tugas"
            />
          </label>
        </div>
        <div>
          <label
            htmlFor="assignment-instructions"
            className="block text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-2 px-1"
          >
            Instruksi Tugas
            <textarea
              id="assignment-instructions"
              value={assignmentData.instructions || ""}
              onChange={(e) =>
                setAssignmentData({
                  ...assignmentData,
                  instructions: e.target.value,
                })
              }
              rows={6}
              className="mt-2 block w-full px-5 py-3 bg-white border border-slate-200 rounded-[24px] focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 outline-none transition-all resize-none font-medium text-slate-600 placeholder:text-slate-400 shadow-sm leading-relaxed normal-case tracking-normal"
              placeholder="Masukkan instruksi lengkap untuk dikerjakan siswa..."
              aria-label="Instruksi Tugas"
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="assignment-max-points"
              className="block text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-2 px-1"
            >
              Maks. Poin
              <input
                id="assignment-max-points"
                type="number"
                min="1"
                value={assignmentData.max_points}
                onChange={(e) =>
                  setAssignmentData({
                    ...assignmentData,
                    max_points: parseInt(e.target.value) || 0,
                  })
                }
                className="mt-2 block w-full px-5 py-3 bg-white border border-slate-200 rounded-[18px] focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 outline-none transition-all font-black text-slate-700 shadow-sm normal-case tracking-normal"
                aria-label="Maks. Poin"
              />
            </label>
          </div>
          <div>
            <label
              htmlFor="assignment-max-attempts"
              className="block text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-2 px-1"
            >
              Maks. Percobaan
              <input
                id="assignment-max-attempts"
                type="number"
                min="1"
                value={assignmentData.max_attempts}
                onChange={(e) =>
                  setAssignmentData({
                    ...assignmentData,
                    max_attempts: parseInt(e.target.value) || 1,
                  })
                }
                className="mt-2 block w-full px-5 py-3 bg-white border border-slate-200 rounded-[18px] focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 outline-none transition-all font-black text-slate-700 shadow-sm normal-case tracking-normal"
                aria-label="Maks. Percobaan"
              />
            </label>
          </div>
        </div>
        <div>
          <label
            htmlFor="assignment-due-date"
            className="block text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-2 px-1"
          >
            Tenggat Waktu (Opsional)
            <div className="relative group mt-2">
              <input
                id="assignment-due-date"
                type="date"
                value={assignmentData.due_date || ""}
                onChange={(e) =>
                  setAssignmentData({
                    ...assignmentData,
                    due_date: e.target.value || null,
                  })
                }
                className="w-full px-5 py-3 pl-11 bg-white border border-slate-200 rounded-[18px] focus:ring-4 focus:ring-indigo-50 focus:border-indigo-300 outline-none transition-all font-bold text-slate-700 shadow-sm normal-case tracking-normal"
                aria-label="Tenggat Waktu (Opsional)"
              />
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-500 transition-colors pointer-events-none" />
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
