import { AlertCircle, ArrowLeft, CheckCircle, Eye, Loader2, Save, Users } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { AssignCourseModal } from '@/src/components/Classroom/AssignCourseModal'
import { useBuilder } from '@/src/contexts/BuilderContext'
import { cn } from '@/src/utils/cn'
export function BuilderTopBar() {
  const { state, actions } = useBuilder()
  const navigate = useNavigate()
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)

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

  return (
    <div className="h-20 bg-white/70 border-b border-slate-200/60 flex items-center justify-between px-8 shrink-0 sticky top-0 z-40 backdrop-blur-xl">
      {/* Left: Back + Title */}
      <div className="flex items-center gap-6 min-w-0">
        <button
          onClick={() => navigate('/app/teacher/courses')}
          className="p-2.5 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 rounded-xl transition-all text-slate-500 group"
          title="Kembali"
          aria-label="Kembali ke daftar kursus"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
        </button>

        <div className="h-10 w-[1px] bg-slate-200/50" />

        <div className="min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black text-slate-800 tracking-tight truncate">
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
            window.open(`/#/app/student/courses/${state.courseId}?preview=true`, '_blank')
          }}
          disabled={!state.courseId}
          className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200/60 hover:text-indigo-600 hover:bg-white hover:shadow-md hover:-translate-y-0.5 rounded-xl transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Eye className="w-4 h-4" />
          Pratinjau
        </button>

        {/* Publish/Draft Toggle Button */}
        {state.courseStatus === 'published' ? (
          <button
            onClick={() => actions.draftCourse()}
            className="px-5 py-2.5 text-sm font-bold text-amber-600 bg-white border border-amber-200/60 hover:bg-amber-50 hover:shadow-md hover:-translate-y-0.5 rounded-xl transition-all flex items-center gap-2 shadow-sm"
          >
            BATALKAN PUBLIKASI
          </button>
        ) : (
          <button
            onClick={() => actions.publishCourse()}
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
    </div>
  )
}
