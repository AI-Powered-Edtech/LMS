import {
  ArrowLeft,
  FileText,
  GraduationCap,
  Loader2,
  Send,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";

import { useToast } from "@/components/ui";
import type {
  Assignment,
  AssignmentSubmission,
} from "@/features/assignments/api/assignmentService";
import { assignmentService } from "@/features/assignments/api/assignmentService";
import { sanitizeUrl } from "@/utils/sanitize";

interface GradingModalProps {
  submission: AssignmentSubmission | null;
  assignment: Assignment | null;
  tenantId: string | null;
  onClose: () => void;
}

function getStudentName(submission: AssignmentSubmission): string {
  if (Array.isArray(submission.user_profiles)) {
    return submission.user_profiles[0]?.full_name || "Siswa";
  }
  return submission.user_profiles?.full_name || "Siswa";
}

export function GradingModal({
  submission,
  assignment,
  tenantId,
  onClose,
}: GradingModalProps) {
  const { addToast } = useToast();
  const [score, setScore] = useState(submission?.score || 0);
  const [feedback, setFeedback] = useState("");
  const [isSubmittingGrade, setIsSubmittingGrade] = useState(false);

  const handleSaveGrade = useCallback(async () => {
    if (!submission || !tenantId) return;
    setIsSubmittingGrade(true);
    try {
      await assignmentService.gradeSubmission(
        submission.id,
        tenantId,
        score,
        feedback,
      );
      onClose();
    } catch (err) {
      addToast({
        type: "error",
        message:
          "Gagal menyimpan nilai: " +
          (err instanceof Error ? err.message : String(err)),
      });
    } finally {
      setIsSubmittingGrade(false);
    }
  }, [addToast, feedback, onClose, score, submission, tenantId]);

  const handleOpen = useCallback(() => {
    setScore(submission?.score || 0);
    setFeedback("");
  }, [submission]);

  return (
    <AnimatePresence>
      {submission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onAnimationStart={handleOpen}
            className="relative w-full max-w-4xl bg-white dark:bg-slate-800 rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-200">
                    Menilai: {getStudentName(submission)}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Tugas: {assignment?.title}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                aria-label="Kembali"
              >
                <ArrowLeft className="w-5 h-5 text-slate-400 rotate-180" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest px-1">
                  Hasil Pekerjaan Siswa
                </h4>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 min-h-[300px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap text-sm leading-relaxed italic">
                  {submission.submission_text ||
                    "Siswa tidak menyertakan teks tambahan."}
                </div>
                {submission.file_url && (
                  <a
                    href={sanitizeUrl(submission.file_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                      Lihat File Lampiran
                    </span>
                    <span className="sr-only">(buka di tab baru)</span>
                  </a>
                )}
              </div>

              <div className="space-y-6">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest px-1">
                  Berikan Penilaian
                </h4>

                <div className="space-y-2">
                  <label
                    htmlFor="score-input"
                    className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase flex justify-between"
                  >
                    Skor (0 - {assignment?.max_points})
                    <span className="text-blue-600">
                      {score} / {assignment?.max_points}
                    </span>
                  </label>
                  <input
                    id="score-input"
                    type="number"
                    min="0"
                    max={assignment?.max_points}
                    value={score}
                    onChange={(e) => setScore(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="feedback-input"
                    className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                  >
                    Umpan Balik (Feedback)
                  </label>
                  <textarea
                    id="feedback-input"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={8}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                    placeholder="Tuliskan catatan untuk siswa di sini..."
                  />
                </div>

                <button
                  onClick={handleSaveGrade}
                  disabled={isSubmittingGrade}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:bg-slate-300 transform active:scale-[0.98]"
                >
                  {isSubmittingGrade ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  Kirim Penilaian
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
