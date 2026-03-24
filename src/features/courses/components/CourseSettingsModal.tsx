import { Settings, Users, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

import { CourseCollaborators } from './CourseCollaborators'

interface CourseSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  courseId: string
}

export function CourseSettingsModal({ isOpen, onClose, courseId }: CourseSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'collaborators'>('general')

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
              Pengaturan Kursus
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-1 min-h-0">
            {/* Sidebar Tabs */}
            <div className="w-56 border-r border-slate-100 dark:border-slate-800 p-4 space-y-2 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                onClick={() => setActiveTab('general')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all ${
                  activeTab === 'general'
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Settings className="w-4 h-4" />
                Umum
              </button>
              <button
                onClick={() => setActiveTab('collaborators')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all ${
                  activeTab === 'collaborators'
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Users className="w-4 h-4" />
                Kolaborator
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 overflow-y-auto">
              {activeTab === 'general' ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  Pengaturan umum materi belum tersedia.
                </div>
              ) : (
                <CourseCollaborators courseId={courseId} />
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
