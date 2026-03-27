// SYNC-HINT: {%DOPEN% = {{ and %DCLOSE%} = }}. Sync tool converts automatically.
import {
  AlertCircle,
  ArrowLeft,
  BookCopy,
  CheckCircle,
  Eye,
  History,
  Loader2,
  Menu,
  MoreVertical,
  Save,
  Send,
  Settings,
  ThumbsUp,
  Users,
  WifiOff,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { AssignCourseModal } from '@/src/components/Classroom/AssignCourseModal'
import { useBuilder } from '@/src/contexts/BuilderContext'
import { CourseSettingsModal } from '@/src/features/courses/components/CourseSettingsModal'
import { CourseVersionHistoryDrawer } from '@/src/features/courses/components/CourseVersionHistoryDrawer'
import { SaveTemplateModal } from '@/src/features/courses/components/SaveTemplateModal'
import { cn } from '@/src/utils/cn'

import { PresenceAvatars } from './PresenceAvatars'

export function BuilderTopBar() {
  const { state, actions, presence, mobile, offline } = useBuilder()
  const navigate = useNavigate()
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false)
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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
    <div className="h-16 md:h-20 bg-white/70 dark:bg-slate-900/70 border-b border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between px-4 md:px-8 shrink-0 sticky top-0 z-40 backdrop-blur-xl">
      {/* Left: Back + Title */}
      <div className="flex items-center gap-3 md:gap-6 min-w-0">
        {mobile.isMobile && (
          <button
            onClick={mobile.toggleSidebar}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-500"
            aria-label="Toggle navigasi materi"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <button
          onClick={() => navigate('/app/teacher/courses')}
          className="hidden md:flex p-2.5 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700 rounded-xl transition-all text-slate-500 dark:text-slate-400 group"
          title="Kembali"
          aria-label="Kembali ke daftar kursus"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
        </button>

        <div className="hidden md:block h-10 w-[1px] bg-slate-200/50 dark:bg-slate-700/50" />

        <div className="min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-3">
            <h1 className="text-lg md:text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight truncate">
              {state.courseTitle || 'Memuat Kursus...'}
            </h1>
            {!mobile.isMobile && (
              <div
                className={cn(
                  'px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] rounded-full shadow-sm shrink-0',
                  state.courseStatus === 'published'
                    ? 'bg-emerald-500 text-white shadow-emerald-100 dark:shadow-emerald-900/30'
                    : 'bg-amber-400 text-amber-900 shadow-amber-100 dark:shadow-amber-900/30'
                )}
              >
                {state.courseStatus === 'published'
                  ? 'Dipublikasi'
                  : state.courseStatus === 'archived'
                    ? 'Arsip'
                    : 'Draf'}
              </div>
            )}
          </div>
          {state.courseDescription && !mobile.isMobile && (
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5 tracking-wide">
              {state.courseDescription}
            </p>
          )}
        </div>
      </div>

      {/* Right: Status + Actions */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Presence Avatars */}
        {!mobile.isMobile && <PresenceAvatars others={presence.othersArray} />}

        {/* Offline / Save Status */}
        <div aria-live="polite" aria-atomic="true">
          {!offline.isOnline ? (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-amber-200/50 dark:border-amber-800/50">
              <WifiOff className="w-3.5 h-3.5" />
              Offline
            </div>
          ) : (
            state.savingStatus !== 'idle' && (
              <div
                className={cn(
                  'hidden md:flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-100/50 dark:border-slate-700/50 shadow-sm text-xs font-bold uppercase tracking-widest',
                  status.color
                )}
              >
                {status.icon}
                <span className={state.savingStatus === 'saving' ? 'animate-pulse' : ''}>
                  {status.text}
                </span>
              </div>
            )
          )}
        </div>

        <div className="hidden md:block h-8 w-[1px] bg-slate-200/50 dark:bg-slate-700/50 mx-1" />

        {mobile.isMobile ? (
          <>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              aria-label="Menu opsi"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            <AnimatePresence>
              {isMobileMenuOpen && (
                <motion.div
                  initial={%DOPEN% opacity: 0, y: 10 %DCLOSE%}
                  animate={%DOPEN% opacity: 1, y: 0 %DCLOSE%}
                  exit={%DOPEN% opacity: 0, y: 10 %DCLOSE%}
                  className="absolute top-16 right-4 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 flex flex-col z-50"
                >
                  <button
                    onClick={() => {
                      setIsSettingsOpen(true)
                      setIsMobileMenuOpen(false)
                    %DCLOSE%}
                    className="px-4 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3"
                  >
                    <Settings className="w-4 h-4 text-slate-500" /> Pengaturan
                  </button>
                  <button
                    onClick={() => {
                      setIsVersionHistoryOpen(true)
                      setIsMobileMenuOpen(false)
                    %DCLOSE%}
                    className="px-4 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3"
                  >
                    <History className="w-4 h-4 text-slate-500" /> Riwayat Versi
                  </button>
                  <button
                    onClick={() => {
                      setIsSaveTemplateOpen(true)
                      setIsMobileMenuOpen(false)
                    %DCLOSE%}
                    className="px-4 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3"
                  >
                    <BookCopy className="w-4 h-4 text-slate-500" /> Jadikan Template
                  </button>
                  <button
                    onClick={() => {
                      setIsAssignModalOpen(true)
                      setIsMobileMenuOpen(false)
                    %DCLOSE%}
                    className="px-4 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3"
                  >
                    <Users className="w-4 h-4 text-slate-500" /> Bagikan
                  </button>
                  <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
                  <button
                    onClick={() => {
                      navigate('/app/teacher/courses')
                    %DCLOSE%}
                    className="px-4 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 text-rose-500"
                  >
                    <ArrowLeft className="w-4 h-4" /> Keluar
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <>
            {/* Version History Button */}
            <button
              onClick={() => setIsVersionHistoryOpen(true)}
              disabled={!state.courseId}
              className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-750 hover:shadow-md hover:-translate-y-0.5 rounded-xl transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title="Riwayat Versi"
              aria-label="Riwayat versi"
            >
              <History className="w-4 h-4" />
              <span className="hidden lg:inline">Riwayat Versi</span>
            </button>

            {/* Save as Template Button */}
            <button
              onClick={() => setIsSaveTemplateOpen(true)}
              disabled={!state.courseId}
              className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-slate-750 hover:shadow-md hover:-translate-y-0.5 rounded-xl transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title="Simpan sebagai Template Kursus"
              aria-label="Simpan sebagai template"
            >
              <BookCopy className="w-4 h-4" />
              <span className="hidden lg:inline">Jadikan Template</span>
            </button>

            {/* Preview Button */}
            <button
              onClick={() => {
                window.open(`/#/app/student/courses/${state.courseId}?preview=true`, '_blank')
              %DCLOSE%}
              disabled={!state.courseId}
              className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-750 hover:shadow-md hover:-translate-y-0.5 rounded-xl transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Pratinjau kursus"
            >
              <Eye className="w-4 h-4" />
              Pratinjau
            </button>

            {/* Course Settings Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              disabled={!state.courseId}
              className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-750 hover:shadow-md hover:-translate-y-0.5 rounded-xl transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title="Pengaturan Kursus"
              aria-label="Pengaturan kursus"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden lg:inline">Pengaturan</span>
            </button>
          </>
        )}

        {/* Primary Action Buttons (Always visible or adapted) */}
        {!mobile.isMobile && state.courseStatus === 'draft' && (
          <button
            onClick={() => actions.submitForReview()}
            className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-100 dark:shadow-blue-900/30 hover:shadow-blue-200 dark:hover:shadow-blue-900/50 hover:-translate-y-0.5 rounded-xl transition-all flex items-center gap-2 group"
            aria-label="Ajukan review"
          >
            <Send className="w-4 h-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
            <span className="hidden md:inline">Ajukan Review</span>
          </button>
        )}

        {!mobile.isMobile && state.courseStatus === 'in_review' && (
          <button
            onClick={() => actions.approveCourse()}
            className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-100 dark:shadow-emerald-900/30 hover:shadow-emerald-200 dark:hover:shadow-emerald-900/50 hover:-translate-y-0.5 rounded-xl transition-all flex items-center gap-2 group"
            aria-label="Setujui kursus"
          >
            <ThumbsUp className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
            <span className="hidden md:inline">Setujui</span>
          </button>
        )}

        {/* Publish/Draft Toggle Button */}
        {state.courseStatus === 'published' ? (
          <button
            onClick={() => actions.draftCourse()}
            className="px-3 md:px-5 py-2 md:py-2.5 text-xs md:text-sm font-bold text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-800 border border-amber-200/60 dark:border-amber-700/60 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:shadow-md hover:-translate-y-0.5 rounded-xl transition-all flex items-center gap-2 shadow-sm"
            aria-label="Batalkan publikasi"
          >
            BATALKAN
          </button>
        ) : (
          <button
            onClick={() => actions.publishCourse()}
            className="px-3 md:px-6 py-2 md:py-2.5 text-xs md:text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-100 dark:shadow-indigo-900/30 hover:shadow-indigo-200 dark:hover:shadow-indigo-900/50 hover:-translate-y-0.5 rounded-xl transition-all flex items-center gap-2 group"
            aria-label="Publikasi kursus"
          >
            <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span className="hidden md:inline">Publikasi</span>
          </button>
        )}

        {!mobile.isMobile && (
          <button
            onClick={() => setIsAssignModalOpen(true)}
            className="px-5 py-2.5 text-sm font-black text-white bg-slate-900 hover:bg-black dark:bg-slate-700 dark:hover:bg-slate-600 shadow-xl shadow-slate-200 dark:shadow-slate-900/30 hover:shadow-slate-300 dark:hover:shadow-slate-900/50 hover:-translate-y-0.5 rounded-xl transition-all flex items-center gap-2"
            aria-label="Bagikan kursus"
          >
            <Users className="w-4 h-4" />
            <span className="hidden md:inline">Bagikan</span>
          </button>
        )}
      </div>

      {/* Modals */}
      <AssignCourseModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        courseId={state.courseId || ''}
        courseTitle={state.courseTitle || ''}
      />

      <CourseVersionHistoryDrawer
        isOpen={isVersionHistoryOpen}
        onClose={() => setIsVersionHistoryOpen(false)}
        courseId={state.courseId || ''}
      />

      <CourseSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        courseId={state.courseId || ''}
      />

      <SaveTemplateModal
        isOpen={isSaveTemplateOpen}
        onClose={() => setIsSaveTemplateOpen(false)}
        type="course"
        sourceId={state.courseId || ''}
        defaultTitle={state.courseTitle || ''}
      />
    </div>
  )
}
