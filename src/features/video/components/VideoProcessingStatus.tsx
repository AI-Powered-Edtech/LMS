import { AlertCircle, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "@/utils/cn";

import type { VideoAsset } from "../types";

interface VideoProcessingStatusProps {
  asset: VideoAsset;
  onRetry?: () => void;
  className?: string;
}

/**
 * VideoProcessingStatus — displays current processing state of a video asset.
 *
 * - processing: animated spinner + informational message
 * - ready: green checkmark + duration and resolution metadata
 * - error: red alert + error message + optional retry button
 */
export function VideoProcessingStatus({
  asset,
  onRetry,
  className,
}: VideoProcessingStatusProps) {
  if (asset.status === "processing") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl border",
          "bg-blue-50 border-blue-200 text-blue-800",
          "dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300",
          className,
        )}
      >
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Sedang diproses...</p>
          <p className="text-xs opacity-75 mt-0.5">
            Video sedang dikodekan. Ini mungkin memakan beberapa menit.
          </p>
        </div>
        <Clock className="w-4 h-4 opacity-50 shrink-0" />
      </motion.div>
    );
  }

  if (asset.status === "ready") {
    const durationLabel = asset.duration_seconds
      ? formatDuration(asset.duration_seconds)
      : null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl border",
          "bg-green-50 border-green-200 text-green-800",
          "dark:bg-green-950/40 dark:border-green-800 dark:text-green-300",
          className,
        )}
      >
        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Video siap!</p>
          <p className="text-xs opacity-75 mt-0.5">
            {[durationLabel, asset.resolution].filter(Boolean).join(" · ")}
          </p>
        </div>
      </motion.div>
    );
  }

  if (asset.status === "error") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl border",
          "bg-red-50 border-red-200 text-red-800",
          "dark:bg-red-950/40 dark:border-red-800 dark:text-red-300",
          className,
        )}
      >
        <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Proses video gagal</p>
          {asset.error_message && (
            <p className="text-xs opacity-75 mt-0.5 truncate">
              {asset.error_message}
            </p>
          )}
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Coba lagi
          </button>
        )}
      </motion.div>
    );
  }

  return null;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}
