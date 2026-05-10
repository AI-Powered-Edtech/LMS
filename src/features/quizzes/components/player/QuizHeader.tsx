import { cn } from "@/utils/cn";

import { AutosaveIndicator, SaveStatus } from "./AutosaveIndicator";
import { QuizTimerDisplay } from "./QuizTimerDisplay";

interface QuizHeaderProps {
  title: string;
  currentQuestionIdx: number;
  totalQuestions: number;
  saveStatus: SaveStatus;
  isOnline: boolean;
  timeLeft: number | null;
  // Pause/Resume
  isPaused?: boolean;
  pausesRemaining?: number;
  pauseCountdown?: number;
  onPause?: () => void;
  onResume?: () => void;
}

export function QuizHeader({
  title,
  currentQuestionIdx,
  totalQuestions,
  saveStatus,
  isOnline,
  timeLeft,
  isPaused = false,
  pausesRemaining = 0,
  pauseCountdown = 0,
  onPause,
  onResume,
}: QuizHeaderProps) {
  const progress = ((currentQuestionIdx + 1) / totalQuestions) * 100;

  const pauseMinutes = Math.floor(pauseCountdown / 60);
  const pauseSeconds = pauseCountdown % 60;
  const pauseFormatted = `${pauseMinutes}:${pauseSeconds.toString().padStart(2, "0")}`;

  return (
    <div
      className={cn(
        "mb-6 rounded-2xl border overflow-hidden",
        "bg-white dark:bg-slate-900",
        "border-slate-200 dark:border-slate-700",
        "shadow-sm",
      )}
    >
      {/* Progress bar — full width strip at top */}
      <div className="h-1 bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between px-4 md:px-5 py-3 md:py-4">
        {/* Left — title + breadcrumb */}
        <div className="min-w-0 flex-1 mr-4">
          <h1 className="text-base md:text-lg lg:text-xl font-bold text-slate-900 dark:text-slate-50 truncate leading-tight">
            {title}
          </h1>
          <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
            <span
              className={cn(
                "text-xs font-semibold px-2 py-0.5 rounded-md",
                "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
              )}
            >
              Soal {currentQuestionIdx + 1} dari {totalQuestions}
            </span>
            <AutosaveIndicator status={!isOnline ? "offline" : saveStatus} />
            {/* Pause budget badge */}
            {pausesRemaining > 0 && !isPaused && (
              <span
                className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded-md",
                  "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400",
                )}
              >
                Jeda tersisa: {pausesRemaining}
              </span>
            )}
          </div>
        </div>

        {/* Right — timer + pause controls */}
        <div className="shrink-0 flex items-center gap-2">
          {timeLeft !== null && (
            <QuizTimerDisplay timeLeft={timeLeft} isPaused={isPaused} />
          )}

          {/* Pause button — only when quiz is running and pauses remain */}
          {onPause && pausesRemaining > 0 && !isPaused && (
            <button
              onClick={onPause}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold",
                "transition-all duration-200",
                "bg-white dark:bg-slate-800",
                "border-slate-200 dark:border-slate-600",
                "text-slate-700 dark:text-slate-200",
                "hover:bg-slate-50 dark:hover:bg-slate-700",
                "hover:border-slate-300 dark:hover:border-slate-500",
                "active:scale-95",
              )}
              title="Jeda kuis (1x tersedia)"
              aria-label="Jeda kuis"
            >
              <span>⏸</span>
              <span className="hidden sm:inline">Jeda</span>
            </button>
          )}

          {/* Disabled pause button when budget exhausted */}
          {pausesRemaining === 0 && !isPaused && onPause && (
            <button
              disabled
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold",
                "cursor-not-allowed opacity-40",
                "bg-white dark:bg-slate-800",
                "border-slate-200 dark:border-slate-600",
                "text-slate-400 dark:text-slate-500",
              )}
              title="Batas jeda sudah terpakai"
              aria-label="Jeda tidak tersedia"
            >
              <span>⏸</span>
              <span className="hidden sm:inline">Jeda</span>
            </button>
          )}

          {/* Resume button — only when paused */}
          {onResume && isPaused && (
            <button
              onClick={onResume}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-bold",
                "transition-all duration-200 animate-pulse",
                "bg-green-500 dark:bg-green-600",
                "border-green-600 dark:border-green-700",
                "text-white",
                "hover:bg-green-600 dark:hover:bg-green-700",
                "hover:animate-none",
                "active:scale-95",
              )}
              aria-label="Lanjutkan kuis"
            >
              <span>▶</span>
              <span>Lanjutkan</span>
            </button>
          )}
        </div>
      </div>

      {/* Pause banner — shown below header when paused */}
      {isPaused && (
        <div
          className={cn(
            "px-4 md:px-5 py-3",
            "bg-amber-50 dark:bg-amber-900/20",
            "border-t border-amber-200 dark:border-amber-800",
            "flex items-center justify-between gap-3 flex-wrap",
          )}
        >
          <div className="flex items-center gap-2">
            <span className="text-amber-600 dark:text-amber-400 text-lg">
              ⏸
            </span>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Kuis dijeda
            </p>
          </div>
          <p className="text-sm text-amber-700 dark:text-amber-400 font-mono">
            Waktu jeda: <span className="font-bold">{pauseFormatted}</span>{" "}
            tersisa
          </p>
        </div>
      )}
    </div>
  );
}
