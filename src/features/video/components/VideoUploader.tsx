import { CloudUpload, RefreshCw, VideoIcon, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useRef, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/utils/cn";

import { videoUploadService } from "../api/videoUploadService";
import type { UploadProgress, VideoAsset } from "../types";
import { VideoProcessingStatus } from "./VideoProcessingStatus";

interface VideoUploaderProps {
  lessonId?: string;
  blockId?: string;
  onUploaded: (asset: VideoAsset) => void;
  className?: string;
}

/**
 * VideoUploader — drag-and-drop video upload panel.
 *
 * Supports MP4, WebM, MOV up to 500 MB.
 * Displays upload progress, validation errors, and post-upload status.
 */
export function VideoUploader({
  lessonId,
  blockId,
  onUploaded,
  className,
}: VideoUploaderProps) {
  const { tenantId } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({
    loaded: 0,
    total: 0,
    percentage: 0,
    status: "idle",
  });
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedAsset, setUploadedAsset] = useState<VideoAsset | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const reset = useCallback(() => {
    setProgress({ loaded: 0, total: 0, percentage: 0, status: "idle" });
    setValidationError(null);
    setUploadError(null);
    setUploadedAsset(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [previewUrl]);

  const handleFile = useCallback(
    async (file: File) => {
      if (!tenantId) return;

      setValidationError(null);
      setUploadError(null);
      setUploadedAsset(null);

      // Client-side validation
      const err = videoUploadService.validateFile(file);
      if (err) {
        setValidationError(err);
        return;
      }

      // Local preview blob URL
      const blob = URL.createObjectURL(file);
      setPreviewUrl(blob);

      try {
        setProgress({
          loaded: 0,
          total: file.size,
          percentage: 0,
          status: "uploading",
        });

        const asset = await videoUploadService.uploadVideo(
          file,
          lessonId ?? null,
          blockId ?? null,
          tenantId,
          (p) => setProgress(p),
        );

        setUploadedAsset(asset as VideoAsset);
        setProgress((prev) => ({ ...prev, status: "ready" }));
        onUploaded(asset as VideoAsset);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Upload gagal";
        setUploadError(msg);
        setProgress((prev) => ({ ...prev, status: "error" }));
      }
    },
    [tenantId, lessonId, blockId, onUploaded],
  );

  // ── Drag & Drop handlers ─────────────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleFile(file);
      // Reset input so same file can be re-selected
      e.target.value = "";
    },
    [handleFile],
  );

  const isUploading = progress.status === "uploading";
  const isReady = progress.status === "ready";

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drop zone — hidden while uploading or after success */}
      <AnimatePresence mode="wait">
        {!isUploading && !isReady && (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Area unggah video — seret dan lepaskan file di sini"
            onKeyDown={(e) =>
              e.key === "Enter" && fileInputRef.current?.click()
            }
            className={cn(
              "flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-10 cursor-pointer transition-all",
              "bg-neutral-50 dark:bg-neutral-900/50",
              isDragging
                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                : "border-neutral-300 dark:border-neutral-700 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20",
            )}
          >
            <div
              className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center transition-colors",
                isDragging
                  ? "bg-indigo-100 dark:bg-indigo-900/50"
                  : "bg-neutral-100 dark:bg-neutral-800",
              )}
            >
              <CloudUpload
                className={cn(
                  "w-8 h-8 transition-colors",
                  isDragging
                    ? "text-indigo-500 dark:text-indigo-400"
                    : "text-neutral-400 dark:text-neutral-500",
                )}
              />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                Seret video ke sini{" "}
                <span className="text-indigo-600 dark:text-indigo-400 underline underline-offset-2">
                  atau klik untuk pilih file
                </span>
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                MP4, WebM, MOV — maks. 500 MB
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="sr-only"
              onChange={handleInputChange}
            />
          </motion.div>
        )}

        {/* Upload progress */}
        {isUploading && (
          <motion.div
            key="progress"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center shrink-0">
                <VideoIcon className="w-5 h-5 text-indigo-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                  Mengunggah...
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {progress.percentage}% — {formatBytes(progress.loaded)} /{" "}
                  {formatBytes(progress.total)}
                </p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-indigo-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress.percentage}%` }}
                transition={{ ease: "easeOut", duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}

        {/* Success: show video preview + status */}
        {isReady && uploadedAsset && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {previewUrl && (
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                <video
                  src={uploadedAsset.mp4_url ?? previewUrl}
                  className="w-full h-full object-cover"
                  controls
                  aria-label="Preview video yang diunggah"
                />
                <button
                  onClick={reset}
                  title="Hapus dan unggah ulang"
                  aria-label="Hapus dan unggah ulang"
                  className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <VideoProcessingStatus asset={uploadedAsset} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Validation error */}
      <AnimatePresence>
        {validationError && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-sm text-red-600 dark:text-red-400 font-medium"
          >
            {validationError}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Upload error */}
      <AnimatePresence>
        {uploadError && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 p-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40"
          >
            <p className="text-sm text-red-700 dark:text-red-300 flex-1">
              {uploadError}
            </p>
            <button
              onClick={reset}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-red-200 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/40 text-red-700 dark:text-red-300 transition-colors shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Coba lagi
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
