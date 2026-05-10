import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Lock,
  Users2,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useRubricByAssignment } from "@/features/rubrics";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/utils/cn";

import {
  useAssignReviews,
  usePeerReviewConfig,
  useSavePeerReviewConfig,
} from "../queries/peerReviewQueries";

interface PeerReviewConfigPanelProps {
  /** ID of the already-saved assignment. If undefined, panel is locked. */
  assignmentId: string | undefined;
  tenantId: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu",
  assigning: "Sedang ditugaskan",
  in_review: "Sedang direview",
  completed: "Selesai",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  assigning:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  in_review: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  completed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

const INPUT_CLS =
  "w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm";

export function PeerReviewConfigPanel({
  assignmentId,
  tenantId,
}: PeerReviewConfigPanelProps) {
  const { user } = useAuth();
  const addToast = useToast((s) => s.addToast);

  const { data: config, isLoading: configLoading } = usePeerReviewConfig(
    assignmentId,
    tenantId,
  );
  const { data: rubric } = useRubricByAssignment(
    assignmentId ?? null,
    tenantId,
  );
  const saveMutation = useSavePeerReviewConfig();
  const assignMutation = useAssignReviews();

  const [enabled, setEnabled] = useState(false);
  const [reviewsPerStudent, setReviewsPerStudent] = useState(3);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [weightInGrade, setWeightInGrade] = useState(20);
  const [dueDate, setDueDate] = useState("");
  const [rubricId, setRubricId] = useState<string | null>(null);

  // Sync form state from loaded config
  useEffect(() => {
    if (config) {
      setEnabled(true);
      setReviewsPerStudent(config.reviews_per_student);
      setIsAnonymous(config.is_anonymous);
      setWeightInGrade(Math.round(config.weight_in_grade * 100));
      setDueDate(config.due_date ? config.due_date.slice(0, 16) : "");
      setRubricId(config.rubric_id);
    }
  }, [config]);

  if (!assignmentId) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <Lock className="w-6 h-6 text-slate-400" />
        </div>
        <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
          Simpan tugas terlebih dahulu
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Konfigurasi Peer Review hanya tersedia setelah tugas disimpan.
        </p>
      </div>
    );
  }

  if (configLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  const handleSave = async () => {
    if (!user?.id) return;
    try {
      await saveMutation.mutateAsync({
        config: {
          assignment_id: assignmentId,
          reviews_per_student: reviewsPerStudent,
          is_anonymous: isAnonymous,
          rubric_id: rubricId,
          weight_in_grade: weightInGrade / 100,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
        },
        tenantId,
        createdBy: user.id,
      });
      addToast({
        type: "success",
        message: "Konfigurasi peer review disimpan.",
      });
    } catch {
      addToast({
        type: "error",
        message: "Gagal menyimpan konfigurasi. Silakan coba lagi.",
      });
    }
  };

  const handleAssign = async () => {
    if (!config) return;
    try {
      const count = await assignMutation.mutateAsync({
        configId: config.id,
        tenantId,
        assignmentId,
      });
      addToast({
        type: "success",
        message: `Berhasil menugaskan ${count} pasangan peer review.`,
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Gagal menugaskan peer review.";
      addToast({ type: "error", message: msg });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Enable toggle */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Users2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-white">
              Aktifkan Peer Review
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Siswa akan saling menilai tugas satu sama lain
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled((v) => !v)}
          className={cn(
            "relative inline-flex w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500",
            enabled ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600",
          )}
        >
          <span
            className={cn(
              "inline-block w-5 h-5 bg-white rounded-full shadow transform transition-transform mt-0.5",
              enabled ? "translate-x-5" : "translate-x-0.5",
            )}
          />
        </button>
      </div>

      {/* Config panel — only shown when enabled */}
      {enabled && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="space-y-5"
        >
          {/* Status badge */}
          {config && (
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold",
                  STATUS_COLOR[config.status] ?? STATUS_COLOR.pending,
                )}
              >
                {config.status === "in_review" ? (
                  <Clock className="w-3 h-3" />
                ) : config.status === "completed" ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <AlertCircle className="w-3 h-3" />
                )}
                {STATUS_LABEL[config.status] ?? config.status}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Reviews per student */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Jumlah Review per Siswa
              </label>
              <input
                type="number"
                min={1}
                max={5}
                value={reviewsPerStudent}
                onChange={(e) =>
                  setReviewsPerStudent(
                    Math.min(5, Math.max(1, Number(e.target.value))),
                  )
                }
                className={INPUT_CLS}
              />
              <p className="text-xs text-slate-400">Nilai antara 1 sampai 5</p>
            </div>

            {/* Weight in grade */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Bobot Nilai Peer Review:{" "}
                <span className="text-blue-600 dark:text-blue-400">
                  {weightInGrade}%
                </span>
              </label>
              <input
                type="range"
                min={0}
                max={50}
                step={5}
                value={weightInGrade}
                onChange={(e) => setWeightInGrade(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-slate-400">
                <span>0%</span>
                <span>50%</span>
              </div>
            </div>
          </div>

          {/* Anonymity */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Identitas Anonim
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Reviewer tidak teridentifikasi oleh penerima review
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isAnonymous}
              onClick={() => setIsAnonymous((v) => !v)}
              className={cn(
                "relative inline-flex w-10 h-5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500",
                isAnonymous ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600",
              )}
            >
              <span
                className={cn(
                  "inline-block w-4 h-4 bg-white rounded-full shadow transform transition-transform mt-0.5",
                  isAnonymous ? "translate-x-5" : "translate-x-0.5",
                )}
              />
            </button>
          </div>

          {/* Due date */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Batas Waktu Review (Opsional)
            </label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={INPUT_CLS}
            />
          </div>

          {/* Rubric selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Rubrik Penilaian (Opsional)
            </label>
            {rubric ? (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                  {rubric.title}
                </span>
                <button
                  type="button"
                  onClick={() => setRubricId(rubric.id)}
                  className="ml-auto text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Gunakan rubrik ini
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                Belum ada rubrik untuk tugas ini. Buat rubrik di tab Rubrik
                terlebih dahulu.
              </p>
            )}
          </div>

          {/* Save button */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Simpan Konfigurasi
            </button>

            {/* Assign reviews button — only when config exists and status is pending */}
            {config && config.status === "pending" && (
              <button
                type="button"
                onClick={handleAssign}
                disabled={assignMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {assignMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Users2 className="w-4 h-4" />
                )}
                Mulai Penugasan Review
              </button>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
