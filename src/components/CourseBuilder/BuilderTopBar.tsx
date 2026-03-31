import {
  AlertCircle,
  ArrowLeft,
  BookCopy,
  CheckCircle,
  Eye,
  History,
  Loader2,
  MoreVertical,
  Save,
  Send,
  Settings,
  Users,
  WifiOff,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { AssignCourseModal } from '@/components/Classroom/AssignCourseModal'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { useBuilder } from '@/contexts/BuilderContext'
import { CourseSettingsModal } from '@/features/courses/components/CourseSettingsModal'
import { CourseVersionHistoryDrawer } from '@/features/courses/components/CourseVersionHistoryDrawer'
import { SaveTemplateModal } from '@/features/courses/components/SaveTemplateModal'
import { cn } from '@/utils/cn'
import { translateCourseStatus } from '@/utils/statusTranslations'

import { PresenceAvatars } from './PresenceAvatars'

export function BuilderTopBar() {
  const { state, actions, mobile, presence, offline } = useBuilder()
  const { role } = useAuth()
  const navigate = useNavigate()
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false)
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [pendingNavAction, setPendingNavAction] = useState<(() => void) | null>(null)

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

  const courseListPath = role === 'admin' ? '/app/admin/courses' : '/app/teacher/courses'

  const handleExitWithConfirm = () => {
    if (state.savingStatus === 'saving' || offline.isDirty) {
      setPendingNavAction(() => () => navigate(courseListPath))
      setIsConfirmOpen(true)
      return
    }
    navigate(courseListPath)
  }

  return (
    <div className="h-20 bg-white/70 border-b border-slate-200/60 flex items-center justify-between px-8 shrink-0 sticky top-0 z-40 backdrop-blur-xl">
      {/* Left: Back + Title */}
      <div className="flex items-center gap-6 min-w-0">
        <button
          onClick={() => {
            if (state.savingStatus === 'saving' || offline.isDirty) {
              setPendingNavAction(() => () => navigate(-1))
              setIsConfirmOpen(true)
              return
            }
            navigate(-1)
          }}
          className="p-2.5 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 rounded-xl transition-all text-slate-500 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
          title="Kembali"
          aria-label="Kembali"
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
              {translateCourseStatus(state.courseStatus)}
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
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-16 right-4 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 flex flex-col z-50"
                >
                  <button
                    onClick={() => {
                      setIsSettingsOpen(true)
                      setIsMobileMenuOpen(false)
                    }}
                    className="px-4 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3"
                  >
                    <Settings className="w-4 h-4 text-slate-500" /> Pengaturan
                  </button>
                  <button
                    onClick={() => {
                      setIsVersionHistoryOpen(true)
                      setIsMobileMenuOpen(false)
                    }}
                    className="px-4 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3"
                  >
                    <History className="w-4 h-4 text-slate-500" /> Riwayat Versi
                  </button>
                  <button
                    onClick={() => {
                      setIsSaveTemplateOpen(true)
                      setIsMobileMenuOpen(false)
                    }}
                    className="px-4 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3"
                  >
                    <BookCopy className="w-4 h-4 text-slate-500" /> Jadikan Template
                  </button>
                  <button
                    onClick={() => {
                      setIsAssignModalOpen(true)
                      setIsMobileMenuOpen(false)
                    }}
                    className="px-4 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3"
                  >
                    <Users className="w-4 h-4 text-slate-500" /> Bagikan
                  </button>
                  <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      handleExitWithConfirm()
                    }}
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
              }}
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
            <Send className="w-4 h-4" />
            Ajukan Review
          </button>
        )}

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
          disabled={!state.courseId}
          className="px-5 py-2.5 text-sm font-black text-white bg-slate-900 hover:bg-black shadow-xl shadow-slate-200 hover:shadow-slate-300 hover:-translate-y-0.5 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Course Settings Modal */}
      <CourseSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        courseId={state.courseId || ''}
      />

      {/* Version History Drawer */}
      <CourseVersionHistoryDrawer
        isOpen={isVersionHistoryOpen}
        onClose={() => setIsVersionHistoryOpen(false)}
        courseId={state.courseId || ''}
      />

      {/* Save as Template Modal */}
      <SaveTemplateModal
        isOpen={isSaveTemplateOpen}
        onClose={() => setIsSaveTemplateOpen(false)}
        type="course"
        sourceId={state.courseId || ''}
        defaultTitle={state.courseTitle || ''}
      />

      {/* Unsaved Changes Confirmation */}
      <Modal open={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} size="sm">
        <ModalHeader title="Tinggalkan halaman?" onClose={() => setIsConfirmOpen(false)} />
        <ModalBody>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Ada perubahan yang belum tersimpan. Yakin ingin meninggalkan halaman ini?
          </p>
        </ModalBody>
        <ModalFooter>
          <button
            onClick={() => setIsConfirmOpen(false)}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            onClick={() => {
              setIsConfirmOpen(false)
              pendingNavAction?.()
              setPendingNavAction(null)
            }}
            className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Ya, Tinggalkan
          </button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
