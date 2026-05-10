import { Award, ChevronLeft, ChevronRight } from "lucide-react";

import { RemedialBanner } from "@/features/adaptive-paths";

import type { Lesson } from "../../index";

interface LessonBottomNavProps {
  prevLesson: Lesson | null;
  nextLesson: Lesson | null;
  isLastLesson: boolean;
  onSelectLesson: (id: string) => void;
  /** Set when adaptive navigation overrides the default sequential next lesson */
  adaptiveReason?: string | null;
  /** Title of the current lesson, used in the remedial banner */
  currentLessonTitle?: string;
}

export function LessonBottomNav({
  prevLesson,
  nextLesson,
  isLastLesson,
  onSelectLesson,
  adaptiveReason,
  currentLessonTitle = "",
}: LessonBottomNavProps) {
  return (
    <div className="shrink-0 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-4 pb-6 md:pb-4">
      {/* Remedial / adaptive banner — shown above nav buttons */}
      {adaptiveReason != null && nextLesson && (
        <RemedialBanner
          lessonTitle={currentLessonTitle}
          reason={adaptiveReason}
        />
      )}

      <div className="flex items-center gap-3">
        {prevLesson ? (
          <button
            onClick={() => onSelectLesson(prevLesson.id)}
            className="flex items-center justify-center h-14 w-14 md:w-auto md:px-5 md:py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm active:scale-95"
            aria-label="Pelajaran Sebelumnya"
          >
            <ChevronLeft className="w-6 h-6 md:w-4 md:h-4" />
            <span className="hidden md:inline ml-1">Sebelumnya</span>
          </button>
        ) : null}

        {nextLesson ? (
          <button
            onClick={() => onSelectLesson(nextLesson.id)}
            className="flex-1 h-14 md:h-auto md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold text-base md:text-sm transition-all shadow-lg active:scale-95 active:shadow-md"
          >
            <span>Pelajaran Berikutnya</span>
            <ChevronRight className="w-5 h-5 md:w-4 md:h-4" />
          </button>
        ) : isLastLesson ? (
          <div className="flex-1 h-14 md:h-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 font-bold text-base md:text-sm">
            <Award className="w-5 h-5 md:w-4 md:h-4" />
            <span>Modul Selesai!</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
