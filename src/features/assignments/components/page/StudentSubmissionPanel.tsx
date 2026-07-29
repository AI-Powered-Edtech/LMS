import {
  AlertCircle,
  Clock3,
  ExternalLink,
  Link as LinkIcon,
  MessageSquareText,
  Paperclip,
  RotateCcw,
  Send,
  Trash2,
  Upload,
} from "lucide-react";
import type { ChangeEvent, RefObject } from "react";

import { EmptyState } from "@/components/ui";
import type { AssignmentUiState } from "@/features/assignments/types";
import { cn } from "@/utils/cn";
import { sanitizeUrl } from "@/utils/sanitize";

import { getStatusBadge } from "./assignmentPageUtils";

interface StudentSubmissionPanelProps {
  assignment: AssignmentUiState;
  selectedFile: File | null;
  draftText: string;
  draftLink: string;
  isUploading: boolean;
  uploadProgress: Record<string, number>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileChange: (assignmentId: string, file: File | null) => void;
  onClearFile: (assignmentId: string) => void;
  onTextChange: (assignmentId: string, value: string) => void;
  onLinkChange: (assignmentId: string, value: string) => void;
  onTurnIn: (assignmentId: string) => void;
  onUnsubmit: (assignmentId: string) => void;
}

function AttemptStatusBadge({
  status,
  isLate,
}: {
  status: string;
  isLate: boolean;
}) {
  if (status === "graded") {
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
        Dinilai
      </span>
    );
  }

  if (status === "returned") {
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        Revisi
      </span>
    );
  }

  if (status === "submitted" || status === "late") {
    return (
      <span
        className={cn(
          "px-2.5 py-1 rounded-full text-xs font-bold",
          isLate || status === "late"
            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        )}
      >
        {isLate || status === "late" ? "Terlambat" : "Terkirim"}
      </span>
    );
  }

  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
      Draft
    </span>
  );
}

export function StudentSubmissionPanel({
  assignment,
  selectedFile,
  draftText,
  draftLink,
  isUploading,
  uploadProgress,
  fileInputRef,
  onFileChange,
  onClearFile,
  onTextChange,
  onLinkChange,
  onTurnIn,
  onUnsubmit,
}: StudentSubmissionPanelProps) {
  const latestAttempt = assignment.attempts[0] ?? null;
  const progress = uploadProgress[assignment.id] ?? 0;
  const canSubmit =
    Boolean(draftText.trim()) ||
    Boolean(draftLink.trim()) ||
    Boolean(selectedFile) ||
    (!assignment.allowTextSubmission &&
      !assignment.allowLinkSubmission &&
      assignment.allowFileSubmission &&
      Boolean(selectedFile));

  const showResubmit = assignment.canResubmit && assignment.attempts.length > 0;
  const isSubmittedState =
    assignment.status === "submitted" || assignment.status === "late";

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    onFileChange(assignment.id, file);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">
              Pengumpulan Saya
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Gunakan metode submit yang diaktifkan guru. Setiap submit membuat
              attempt baru.
            </p>
          </div>
          {getStatusBadge(assignment.status)}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Sisa Percobaan
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
              {assignment.remainingAttempts}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Penalti Terlambat
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
              {assignment.latePenaltyPercent}%
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Attempt Aktif
            </div>
            <div className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
              {latestAttempt
                ? `Attempt ${latestAttempt.attemptNumber}`
                : "Belum ada"}
            </div>
          </div>
        </div>

        {assignment.availableFrom &&
          new Date(assignment.availableFrom) > new Date() && (
            <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/40 p-4 flex gap-3">
              <Clock3 className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                  Tugas belum dibuka
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Tersedia mulai{" "}
                  {new Date(assignment.availableFrom).toLocaleString("id-ID")}.
                </p>
              </div>
            </div>
          )}

        <div className="space-y-4">
          {assignment.allowTextSubmission && (
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <MessageSquareText className="w-4 h-4 text-blue-500" />
                Jawaban Teks
              </label>
              <textarea
                value={draftText}
                onChange={(event) =>
                  onTextChange(assignment.id, event.target.value)
                }
                rows={7}
                placeholder="Tulis jawaban atau penjelasan Anda di sini..."
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm dark:text-white"
              />
            </div>
          )}

          {assignment.allowLinkSubmission && (
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-blue-500" />
                Link Tugas
              </label>
              <input
                type="url"
                value={draftLink}
                onChange={(event) =>
                  onLinkChange(assignment.id, event.target.value)
                }
                placeholder="https://..."
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-white"
              />
            </div>
          )}

          {assignment.allowFileSubmission && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-blue-500" />
                  Lampiran File
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileInput}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Pilih File
                </button>
              </div>

              {selectedFile ? (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onClearFile(assignment.id)}
                    className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                    aria-label="Hapus file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 p-5 text-sm text-slate-500 dark:text-slate-400">
                  Upload satu file untuk setiap attempt.
                </div>
              )}

              {isUploading && progress > 0 && (
                <div className="space-y-2">
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Mengunggah file... {Math.round(progress)}%
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={() => onTurnIn(assignment.id)}
            disabled={isUploading || !assignment.canResubmit || !canSubmit}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-bold rounded-xl flex items-center gap-2 transition-colors"
          >
            {showResubmit ? (
              <RotateCcw className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {showResubmit ? "Kirim Ulang" : "Kirim Tugas"}
          </button>
          {isSubmittedState && latestAttempt && (
            <button
              type="button"
              onClick={() => onUnsubmit(assignment.id)}
              className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors"
            >
              Batalkan Submit
            </button>
          )}
        </div>

        {!assignment.canResubmit && assignment.remainingAttempts === 0 && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Semua attempt sudah terpakai atau tugas telah ditutup.
            </p>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white">
              Riwayat Attempt
            </h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Attempt terbaru menjadi referensi aktif untuk penilaian.
            </p>
          </div>
        </div>

        {assignment.attempts.length === 0 ? (
          <EmptyState
            icon={<Upload className="w-8 h-8" />}
            title="Belum ada attempt"
            description="Jawaban yang Anda submit akan muncul di sini beserta status penilaiannya."
            className="py-8"
          />
        ) : (
          <div className="space-y-3">
            {assignment.attempts.map((attempt) => (
              <div
                key={attempt.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50/80 dark:bg-slate-800/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-900 dark:text-white">
                        Attempt {attempt.attemptNumber}
                      </p>
                      <AttemptStatusBadge
                        status={attempt.status}
                        isLate={attempt.isLate}
                      />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {attempt.submittedAt
                        ? new Date(attempt.submittedAt).toLocaleString("id-ID")
                        : "Belum disubmit"}
                    </p>
                  </div>
                  {(attempt.grade !== null || attempt.rawScore !== null) && (
                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {attempt.grade ?? attempt.rawScore}/
                        {assignment.maxGrade}
                      </div>
                      {attempt.rawScore !== null &&
                        attempt.grade !== null &&
                        attempt.rawScore !== attempt.grade && (
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            Raw {attempt.rawScore} sebelum penalti
                          </div>
                        )}
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  {attempt.text && (
                    <p className="whitespace-pre-wrap">{attempt.text}</p>
                  )}
                  {attempt.fileUrl && (
                    <a
                      href={sanitizeUrl(attempt.fileUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium hover:underline"
                    >
                      <Paperclip className="w-4 h-4" />
                      {attempt.fileName || "Lihat lampiran"}
                      <span className="sr-only">(buka di tab baru)</span>
                    </a>
                  )}
                  {attempt.linkUrl && (
                    <a
                      href={sanitizeUrl(attempt.linkUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {attempt.linkUrl}
                      <span className="sr-only">(buka di tab baru)</span>
                    </a>
                  )}
                  {attempt.feedback && (
                    <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                        Umpan Balik Guru
                      </p>
                      <p className="whitespace-pre-wrap">{attempt.feedback}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
