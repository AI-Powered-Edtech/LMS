import { AlertCircle, ArrowLeft, CheckCircle, Eye, Loader2, Save, Users } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { AssignCourseModal } from '@/src/components/Classroom/AssignCourseModal'
import { ConfirmModal } from '@/src/components/ui'
import { useBuilder } from '@/src/contexts/BuilderContext'
import { getPublishReadiness } from '@/src/features/courses/builder/useCourseActions'
import { cn } from '@/src/utils/cn'
export function BuilderTopBar() {
  const { state, actions } = useBuilder()
  const navigate = useNavigate()
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [confirmPublishOpen, setConfirmPublishOpen] = useState(false)
  const [confirmUnpublishOpen, setConfirmUnpublishOpen] = useState(false)

  const statusConfig = {
    idle: { icon: null, text: '', color: '' },
    saving: {
      icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
      text: 'Menyimpan...',
      color: 'text-amber-500',
    },
    saved: {
      icon: <CheckCircle className="w-3.5 h-3.5" />,
      text: 'Tersimpan',
      color: 'text-emerald-500',
    },
    error: {
      icon: <AlertCircle className="w-3.5 h-3.5" />,
      text: 'Gagal menyimpan',
      color: 'text-red-500',
    },
  }

  const status = statusConfig[state.savingStatus]
  const publishReadiness = getPublishReadiness(state.modules)

  return (
    <div className="h-20 bg-white/60 dark:bg-slate-900/40 border-b border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between px-6 shrink-0 sticky top-0 z-40 backdrop-blur-xl">
      {/* Left: Back + Title */}
      <div className="flex items-center gap-6 min-w-0">
        <button
          onClick={() => navigate(-1)}
          className="p-2.5 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 rounded-xl transition-all text-slate-500 dark:text-slate-300 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
          title="Kembali"
          aria-label="Kembali"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
        </button>

        <div className="h-10 w-[1px] bg-slate-200/50" />

        <div className="min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight truncate">
              {state.courseTitle || 'Memuat Kursus...'}
            </h1>
            <div
              className={cn(
                'px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] rounded-full shadow-sm',
                state.courseStatus === 'published'
                  ? 'bg-emerald-500 text-white shadow-emerald-100'
                  : 'bg-amber-400 text-amber-900 shadow-amber-100'
              )}
            >
              {state.courseStatus === 'published'
                ? 'Dipublikasi'
                : state.courseStatus === 'archived'
                  ? 'Arsip'
                  : 'Draf'}
            </div>
          </div>
          {state.courseDescription && (
            <p className="text-xs font-medium text-slate-400 truncate mt-0.5 tracking-wide">
              {state.courseDescription}
            </p>
          )}
        </div>
      </div>

      {/* Right: Status + Actions */}
      <div className="flex items-center gap-4">
        {/* Save Status */}
        {state.savingStatus !== 'idle' && (
          <div
            className={cn(
              'flex items-center gap-2 px-4 py-2 bg-white/50 rounded-xl border border-slate-100/50 shadow-sm text-xs font-bold uppercase tracking-widest',
              status.color
            )}
          >
            {status.icon}
            <span className={state.savingStatus === 'saving' ? 'animate-pulse' : ''}>
              {status.text}
            </span>
          </div>
        )}

        <div className="h-8 w-[1px] bg-slate-200/50 mx-1" />

        {/* Preview Button */}
        <button
          onClick={() => {
            window.open(`/courses/${state.courseId}?preview=true`, '_blank')
          }}
          disabled={!state.courseId}
          className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-200 bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md hover:-translate-y-0.5 rounded-xl transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Eye className="w-4 h-4" />
          Pratinjau
        </button>

        {/* Publish/Draft Toggle Button */}
        {state.courseStatus === 'published' ? (
          <button
            onClick={() => setConfirmUnpublishOpen(true)}
            className="px-5 py-2.5 text-sm font-bold text-amber-700 bg-white/80 dark:bg-slate-800/80 border border-amber-200/60 dark:border-amber-900/40 hover:bg-amber-50/60 dark:hover:bg-amber-950/20 hover:shadow-md hover:-translate-y-0.5 rounded-xl transition-all flex items-center gap-2 shadow-sm"
          >
            BATALKAN PUBLIKASI
          </button>
        ) : (
          <button
            onClick={() => setConfirmPublishOpen(true)}
            className="px-6 py-2.5 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-100 hover:shadow-indigo-200 hover:-translate-y-0.5 rounded-xl transition-all flex items-center gap-2 group"
          >
            <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
            Publikasi
          </button>
        )}

        <button
          onClick={() => setIsAssignModalOpen(true)}
          className="px-5 py-2.5 text-sm font-black text-white bg-slate-900 hover:bg-black shadow-xl shadow-slate-200 hover:shadow-slate-300 hover:-translate-y-0.5 rounded-xl transition-all flex items-center gap-2"
        >
          <Users className="w-4 h-4" />
          Bagikan
        </button>
      </div>

      {/* Post-Publish Assignment Modal */}
      <AssignCourseModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        courseId={state.courseId || ''}
        courseTitle={state.courseTitle || ''}
      />

      <ConfirmModal
        open={confirmPublishOpen}
        onClose={() => setConfirmPublishOpen(false)}
        title="Publikasikan kursus ini?"
        description={
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Pastikan kursus sudah siap agar siswa dapat mengakses materi yang benar.
            </p>

            <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/70 bg-slate-50/60 dark:bg-slate-800/40 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300 mb-3">
                Checklist Publish
              </p>
              <div className="space-y-2">
                {publishReadiness.checks.map((c) => (
                  <div key={c.id} className="flex items-start gap-2">
                    {c.ok ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                    )}
                    <p
                      className={cn(
                        'text-sm leading-relaxed',
                        c.ok
                          ? 'text-slate-700 dark:text-slate-200'
                          : 'text-slate-700 dark:text-slate-200'
                      )}
                    >
                      {c.label}
                    </p>
                  </div>
                ))}
              </div>
              {!publishReadiness.ready && (
                <p className="mt-3 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  Perbaiki checklist di atas sebelum publikasi.
                </p>
              )}
            </div>
          </div>
        }
        confirmText="Ya, publikasikan"
        cancelText="Batal"
        confirmDisabled={!publishReadiness.ready}
        danger={false}
        onConfirm={() => actions.publishCourse()}
      />

      <ConfirmModal
        open={confirmUnpublishOpen}
        onClose={() => setConfirmUnpublishOpen(false)}
        title="Batalkan publikasi kursus?"
        description={
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Kursus akan kembali menjadi draf dan tidak terlihat oleh siswa sampai Anda mempublikasikannya
            lagi.
          </p>
        }
        confirmText="Ya, batalkan"
        cancelText="Batal"
        onConfirm={() => actions.draftCourse()}
        danger
      />
    </div>
  )
}
