import { ShieldCheck } from "lucide-react";
import { useState } from "react";

import { useToast } from "@/hooks/useToast";

import { plagiarismService } from "../api/plagiarismService";
import type { PlagiarismStatus } from "../types";
import { PlagiarismBadge } from "./PlagiarismBadge";

interface PlagiarismCheckButtonProps {
  submissionId: string;
  tenantId: string;
  /** Pre-loaded status from DB (if a check was already run before). */
  initialScore?: number | null;
  initialStatus?: PlagiarismStatus | null;
}

/**
 * Button for teachers to trigger a plagiarism check on a submission.
 * Shows a PlagiarismBadge after the check completes.
 * xAPI-style fire-and-forget — errors are shown via toast, never block the UI.
 */
export function PlagiarismCheckButton({
  submissionId,
  tenantId: _tenantId,
  initialScore = null,
  initialStatus = null,
}: PlagiarismCheckButtonProps) {
  const { addToast } = useToast();

  const [isChecking, setIsChecking] = useState(false);
  const [score, setScore] = useState<number | null>(initialScore);
  const [status, setStatus] = useState<PlagiarismStatus | null>(initialStatus);

  const hasResult = status === "completed" || status === "error";

  const handleCheck = async () => {
    if (isChecking) return;
    setIsChecking(true);
    setStatus("processing");

    try {
      const result = await plagiarismService.checkPlagiarism(submissionId);
      setScore(result.similarity_score);
      setStatus(result.status);

      if (result.similarity_score > 50) {
        addToast({
          type: "warning",
          message: "Kemiripan teks tinggi terdeteksi",
          description: `Skor kemiripan: ${result.similarity_score}%. Harap tinjau submisi ini.`,
        });
      } else {
        addToast({
          type: "success",
          message: "Pemeriksaan plagiarisme selesai",
          description: `Skor kemiripan: ${result.similarity_score}%`,
        });
      }
    } catch (err) {
      setStatus("error");
      addToast({
        type: "error",
        message: "Gagal memeriksa plagiarisme",
        description:
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan tidak diketahui",
      });
    } finally {
      setIsChecking(false);
    }
  };

  if (hasResult && status) {
    return (
      <div className="flex items-center gap-2">
        <PlagiarismBadge score={score} status={status} />
        <button
          type="button"
          onClick={handleCheck}
          disabled={isChecking}
          className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 underline underline-offset-2 transition-colors disabled:cursor-not-allowed"
        >
          Periksa ulang
        </button>
      </div>
    );
  }

  if (status === "processing" || isChecking) {
    return <PlagiarismBadge score={null} status="processing" />;
  }

  // Real handler at plagiarism_handlers::check_plagiarism_handler (mounted in
  // main.rs at /api/v1/plagiarism/check) computes Jaccard word-set similarity
  // against sibling submissions of the same assignment. G-3 BE-trim simplified
  // the request to just { submission_id }; the FE adapter
  // (plagiarismService.checkPlagiarism) maps the response to our
  // CheckPlagiarismResult shape. (2026-05-09)
  return (
    <button
      type="button"
      onClick={handleCheck}
      disabled={isChecking}
      aria-label="Periksa Plagiarisme"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
        bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100
        dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-900/40
        transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
      Periksa Plagiarisme
    </button>
  );
}
