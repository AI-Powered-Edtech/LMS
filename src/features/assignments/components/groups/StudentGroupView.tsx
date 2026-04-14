import {
  ArrowLeft,
  CheckCircle2,
  CheckSquare,
  Clock,
  FileText,
  FileUp,
  MessageSquare,
  MoreVertical,
  Plus,
  Send,
  UploadCloud,
  Users,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useToast } from '@/src/components/ui'
import { cn } from '@/src/utils/cn'

interface Task {
  id: number
  title: string
  assignee: string
  status: string
}

interface ChatMessage {
  id: number
  sender: string
  text: string
  time: string
}

export function StudentGroupView() {
  const addToast = useToast((s) => s.addToast)
  const [activeTab, setActiveTab] = useState('workspace')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // TODO: Replace with real data from API API
  const [tasks, setTasks] = useState<Task[]>([])
  const [chat, setChat] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [newTaskTitle, setNewTaskTitle] = useState('')

  const handleSendMessage = () => {
    if (!newMessage.trim()) return
    setChat([
      ...chat,
      {
        id: Date.now(),
        sender: 'Anda',
        text: newMessage,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ])
    setNewMessage('')
  }

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return
    setTasks([
      ...tasks,
      { id: Date.now(), title: newTaskTitle, assignee: 'Belum ditugaskan', status: 'pending' },
    ])
    setNewTaskTitle('')
  }

  const toggleTaskStatus = (id: number) => {
    setTasks(
      tasks.map((t) => {
        if (t.id === id) {
          const nextStatus =
            t.status === 'pending'
              ? 'in_progress'
              : t.status === 'in_progress'
                ? 'completed'
                : 'pending'
          return { ...t, status: nextStatus }
        }
        return t
      })
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-3xl -mr-20 -mt-20 opacity-50 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <Link
                to="/assignments"
                className="p-1 -ml-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-full flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Tugas Kelompok
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3">
              Tugas Kelompok
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed max-w-3xl">
              Belum ada tugas kelompok yang ditugaskan. Hubungi guru Anda untuk informasi lebih
              lanjut.
            </p>
          </div>

          <div className="shrink-0 flex flex-col items-end gap-4">
            <button
              onClick={() => setIsSubmitting(true)}
              disabled={tasks.length === 0}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors shadow-sm shadow-indigo-200 w-full md:w-auto"
            >
              Serahkan Tugas Kelompok
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left/Main Column: Workspace & Tasks */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="flex gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-x-auto hide-scrollbar">
            {[
              { id: 'workspace', icon: FileText, label: 'Ruang Kerja' },
              { id: 'tasks', icon: CheckSquare, label: 'Pembagian Tugas' },
              { id: 'peer_review', icon: Users, label: 'Penilaian Sejawat' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap',
                  activeTab === tab.id
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
            {activeTab === 'workspace' && (
              <div className="p-6 flex flex-col h-full">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Dokumen Kolaborasi
                  </h3>
                  <button className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1">
                    <FileUp className="w-4 h-4" /> Buka di Drive
                  </button>
                </div>
                <div className="flex-1 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-2xl bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                  </div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Belum ada dokumen
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                    Dokumen kolaborasi akan tersedia setelah tugas kelompok dibuat oleh guru.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="p-6 flex flex-col h-full">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Daftar Tugas Kelompok
                  </h3>
                  <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                    {tasks.filter((t) => t.status === 'completed').length}/{tasks.length} Selesai
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {tasks.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                      <CheckSquare className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                      <p className="font-medium">Belum ada sub-tugas.</p>
                      <p className="text-sm mt-1">Tambahkan sub-tugas di bawah.</p>
                    </div>
                  ) : (
                    tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-200 dark:hover:border-indigo-700 transition-colors group"
                      >
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => toggleTaskStatus(task.id)}
                            aria-label={`Ubah status: ${task.title}`}
                            className={cn(
                              'w-6 h-6 rounded flex items-center justify-center border transition-colors',
                              task.status === 'completed'
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : task.status === 'in_progress'
                                  ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-600'
                                  : 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-transparent hover:border-indigo-400'
                            )}
                          >
                            {task.status === 'completed' ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : task.status === 'in_progress' ? (
                              <Clock className="w-4 h-4" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 opacity-0 group-hover:opacity-20 text-indigo-600" />
                            )}
                          </button>
                          <div>
                            <p
                              className={cn(
                                'font-bold text-sm transition-colors',
                                task.status === 'completed'
                                  ? 'text-slate-400 line-through'
                                  : 'text-slate-800 dark:text-slate-200'
                              )}
                            >
                              {task.title}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              Penanggung Jawab: {task.assignee}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          aria-label="Opsi sub-tugas"
                          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                      placeholder="Tambah sub-tugas baru..."
                      className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-900 dark:text-slate-100"
                    />
                    <button
                      onClick={handleAddTask}
                      disabled={!newTaskTitle.trim()}
                      aria-label="Tambah sub-tugas"
                      className="px-4 py-2.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 font-bold rounded-xl transition-colors disabled:opacity-50"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'peer_review' && (
              <div className="p-6 flex flex-col h-full">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Penilaian Sejawat
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Nilai kontribusi anggota kelompok Anda. Penilaian ini bersifat rahasia.
                  </p>
                </div>
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  <Users className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                  <p className="font-medium">Belum ada anggota kelompok.</p>
                  <p className="text-sm mt-1">
                    Penilaian sejawat tersedia setelah kelompok dibentuk.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Group Chat */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 rounded-t-3xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800 dark:text-slate-200">Diskusi Kelompok</h3>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/30 dark:bg-slate-900/30 custom-scrollbar">
              {chat.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500 text-sm">
                  Belum ada pesan. Mulai diskusi!
                </div>
              ) : (
                chat.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex flex-col max-w-[85%]',
                      msg.sender === 'Anda' ? 'ml-auto items-end' : 'items-start'
                    )}
                  >
                    <span className="text-[10px] text-slate-500 mb-1 font-medium ml-1">
                      {msg.sender}
                    </span>
                    <div
                      className={cn(
                        'p-3 rounded-2xl text-sm shadow-sm',
                        msg.sender === 'Anda'
                          ? 'bg-indigo-600 text-white rounded-tr-none'
                          : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none'
                      )}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 font-medium">{msg.time}</span>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-b-3xl">
              <div className="flex gap-2 relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ketik pesan..."
                  className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-900 dark:text-slate-100"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg disabled:opacity-50 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      <AnimatePresence>
        {isSubmitting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl w-full max-w-md overflow-hidden p-6 text-center"
            >
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Serahkan Tugas Kelompok?
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                Tugas akan diserahkan atas nama seluruh anggota kelompok. Pastikan semua anggota
                telah menyelesaikan bagiannya.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsSubmitting(false)}
                  className="flex-1 py-2.5 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    setIsSubmitting(false)
                    addToast({
                      type: 'info',
                      message:
                        'Pengumpulan tugas kelompok belum tersedia. Fitur ini sedang dalam pengembangan.',
                    })
                  }}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-sm"
                >
                  Ya, Serahkan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
