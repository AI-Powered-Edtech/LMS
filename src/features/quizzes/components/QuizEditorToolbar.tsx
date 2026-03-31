import { AlertTriangle, CheckCircle, HelpCircle, Loader2 } from 'lucide-react'

import { cn } from '@/src/utils/cn'

interface QuizEditorToolbarProps {
  isPublished: boolean
  isSaving: boolean
  isPublishing: boolean
  error: string | null
  onSave: () => void
  onPublishToggle: () => void
}

export function QuizEditorToolbar({
  isPublished,
  isSaving,
  isPublishing,
  error,
  onSave,
  onPublishToggle,
}: QuizEditorToolbarProps) {
  return (
    <>
      <div className="flex items-start justify-between gap-4 p-6 bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-700 shadow-sm dark:shadow-slate-900/50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-[20px] bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 shadow-inner">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">
              Pengaturan Kuis
            </h3>
            <div
              className={cn(
                'inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.1em] px-3 py-1 rounded-full mt-1 shadow-sm',
                isPublished
                  ? 'bg-emerald-500 text-white shadow-emerald-100'
                  : 'bg-amber-400 text-amber-900 shadow-amber-100'
              )}
            >
              {isPublished ? (
                <CheckCircle className="w-3.5 h-3.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5" />
              )}
              {isPublished ? 'Diterbitkan' : 'Draft'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onSave}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-black text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-all flex items-center gap-2 shadow-sm"
          >
            {isSaving && !isPublishing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            SIMPAN DRAFT
          </button>
          <button
            onClick={onPublishToggle}
            disabled={isSaving}
            className={cn(
              'px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-2 shadow-lg',
              isPublished
                ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 shadow-amber-100'
                : 'text-white bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'
            )}
          >
            {isPublishing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isPublished ? 'BATALKAN TERBIT' : 'TERBITKAN KUIS'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 text-sm rounded-xl flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </>
  )
}
