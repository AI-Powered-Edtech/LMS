// SYNC-HINT: {{ = {{ and }} = }}. Sync tool converts automatically.
import { Check, Clock, Plus, Trash2, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'

import { useAuth } from '@/src/contexts/AuthContext'
import type { InteractiveEvent, InteractiveVideoMetadata } from '@/src/features/lessons/types'
import { getTeacherQuizzes } from '@/src/features/quizzes/api/quizManager.service'

interface InteractiveVideoEditorProps {
  metadata: InteractiveVideoMetadata
  onSave: (metadata: InteractiveVideoMetadata) => void
  onClose: () => void
}

export function InteractiveVideoEditor({ metadata, onSave, onClose }: InteractiveVideoEditorProps) {
  const { tenantId } = useAuth()
  const [events, setEvents] = useState<InteractiveEvent[]>(metadata.interactiveEvents || [])
  const [quizzes, setQuizzes] = useState<{ id: string; title: string }[]>([])
  const [_loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadQuizzes() {
      if (!tenantId) return
      try {
        const data = await getTeacherQuizzes(tenantId)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setQuizzes(data.map((q: any) => ({ id: String(q.id ?? ''), title: String(q.title ?? '') })))
      } catch (err) {
        console.error('Failed to load quizzes', err)
      } finally {
        setLoading(false)
      }
    }
    loadQuizzes()
  }, [tenantId])

  const handleAddEvent = () => {
    setEvents([...events, { timeInSeconds: 0, type: 'quiz' }])
  }

  const handleUpdateEvent = (index: number, updates: Partial<InteractiveEvent>) => {
    const newEvents = [...events]
    newEvents[index] = { ...newEvents[index], ...updates }
    setEvents(newEvents)
  }

  const handleDeleteEvent = (index: number) => {
    const newEvents = [...events]
    newEvents.splice(index, 1)
    setEvents(newEvents)
  }

  const handleSave = () => {
    onSave({
      ...metadata,
      interactiveEvents: events.sort((a, b) => a.timeInSeconds - b.timeInSeconds),
    })
    onClose()
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const parseTime = (timeStr: string) => {
    const parts = timeStr.split(':')
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1])
    }
    return parseInt(timeStr) || 0
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              Edit Interaksi Video
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Tambahkan kuis pop-up pada detik tertentu.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <AnimatePresence mode="popLayout">
            {events.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-12 px-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-800/50"
              >
                <div className="w-16 h-16 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Clock className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-2">
                  Belum ada event
                </h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6 text-sm">
                  Tambahkan event untuk memunculkan kuis saat video diputar.
                </p>
                <button
                  onClick={handleAddEvent}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Event Pertama
                </button>
              </motion.div>
            ) : (
              events.map((event, idx) => (
                <motion.div
                  key={idx}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start md:items-center shadow-sm"
                >
                  <div className="w-full md:w-32 shrink-0">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                      Waktu (MM:SS)
                    </label>
                    <input
                      type="text"
                      placeholder="00:00"
                      value={formatTime(event.timeInSeconds)}
                      onChange={(e) => {
                        const val = e.target.value
                        if (/^[0-9:]*$/.test(val)) {
                          // Update on blur only
                        }
                      }}
                      onBlur={(e) =>
                        handleUpdateEvent(idx, { timeInSeconds: parseTime(e.target.value) })
                      }
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-600 transition-colors"
                    />
                  </div>

                  <div className="w-full md:flex-1">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                      Pilih Kuis
                    </label>
                    <select
                      value={event.quizId || ''}
                      onChange={(e) => handleUpdateEvent(idx, { quizId: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-600 transition-colors"
                    >
                      <option value="">-- Pilih Kuis --</option>
                      {quizzes.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => handleDeleteEvent(idx)}
                    className="p-2 text-red-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors mt-6 md:mt-0"
                    title="Hapus Event"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </motion.div>
              ))
            )}
          </AnimatePresence>
          {events.length > 0 && (
            <button
              onClick={handleAddEvent}
              className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 font-medium hover:border-indigo-300 dark:hover:border-indigo-600 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Tambah Event Lagi
            </button>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-200/50 dark:hover:bg-slate-700/50 rounded-xl transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors shadow-sm shadow-indigo-200 dark:shadow-indigo-900 flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Simpan Perubahan
          </button>
        </div>
      </motion.div>
    </div>
  )
}
