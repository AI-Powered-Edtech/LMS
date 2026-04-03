import { useBuilder } from '@/contexts/BuilderContext'
import { cn } from '@/utils/cn'

interface MobileCourseBuilderNavProps {
  activeTab: 'struktur' | 'editor'
  onTabChange: (tab: 'struktur' | 'editor') => void
}

/**
 * MobileCourseBuilderNav — Sticky bottom navigation bar untuk Course Builder di mobile.
 * Hanya tampil di mobile (block md:hidden).
 * Menampilkan badge nama lesson yang sedang aktif dan tombol navigasi Struktur / Edit.
 */
export function MobileCourseBuilderNav({ activeTab, onTabChange }: MobileCourseBuilderNavProps) {
  const { state } = useBuilder()

  const activeLessonTitle =
    state.modules.flatMap((m) => m.lessons).find((l) => l.id === state.activeLesson?.id)?.title ??
    null

  return (
    <div className="block md:hidden shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 safe-area-bottom">
      {/* Badge nama lesson yang sedang diedit */}
      {activeLessonTitle && (
        <div className="px-4 pt-2 pb-1">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
            <svg
              className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 truncate">
              {activeLessonTitle}
            </span>
          </div>
        </div>
      )}

      {/* Tab Buttons */}
      <div className="flex gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => onTabChange('struktur')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all min-h-[44px]',
            activeTab === 'struktur'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          )}
          aria-label="Tampilkan struktur kursus"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          Struktur
        </button>

        <button
          type="button"
          onClick={() => onTabChange('editor')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all min-h-[44px]',
            activeTab === 'editor'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          )}
          aria-label="Tampilkan editor konten"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          Edit
        </button>
      </div>
    </div>
  )
}
