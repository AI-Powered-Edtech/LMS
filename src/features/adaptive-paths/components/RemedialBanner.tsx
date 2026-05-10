import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

interface RemedialBannerProps {
  lessonTitle: string;
  reason: string | null;
}

export function RemedialBanner({
  lessonTitle: _lessonTitle,
  reason,
}: RemedialBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const message =
    reason?.trim() ||
    "Berdasarkan performa Anda, materi ini direkomendasikan sebelum melanjutkan.";

  return (
    <div
      role="alert"
      className="flex items-start gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl mb-3"
    >
      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
      <p className="flex-1 text-sm font-medium text-amber-800 dark:text-amber-300">
        <span className="font-bold">Materi Tambahan — </span>
        {message}
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="p-0.5 text-amber-500 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-200 transition-colors rounded-lg"
        aria-label="Tutup notifikasi"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
