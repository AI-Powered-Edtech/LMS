import { ArrowLeft, CheckCircle2, CheckSquare, FileText, FileUp, Users } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useToast } from '@/src/components/ui'
import { useAuth } from '@/src/contexts/AuthContext'
import { cn } from '@/src/utils/cn'

import { useStudentGroup, useSubmitGroupAssignment } from '../../hooks/useGroupAssignments'
import { GroupChatPanel } from './GroupChatPanel'
import { GroupTasksTab } from './GroupTasksTab'
import { SubmitGroupModal } from './SubmitGroupModal'

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

interface Props {
  assignmentId: string
}

export function StudentGroupView({ assignmentId }: Props) {
  const { user } = useAuth()
  const addToast = useToast((s) => s.addToast)
  const [activeTab, setActiveTab] = useState('workspace')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [chat, setChat] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [newTaskTitle, setNewTaskTitle] = useState('')

  const { data: groupData, isLoading, isError } = useStudentGroup(assignmentId)
  const submitMutation = useSubmitGroupAssignment(assignmentId)

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
        if (t.id !== id) return t
        const next =
          t.status === 'pending'
            ? 'in_progress'
            : t.status === 'in_progress'
              ? 'completed'
              : 'pending'
        return { ...t, status: next }
      })
    )
  }

  const handleConfirmSubmit = async () => {
    if (!groupData?.group?.id) return
    try {
      await submitMutation.mutateAsync({ groupId: groupData.group.id })
      setIsSubmitting(false)
      addToast({ type: 'success', message: 'Tugas kelompok berhasil diserahkan.' })
    } catch {
      addToast({ type: 'error', message: 'Gagal menyerahkan tugas. Coba lagi.' })
    }
  }

  const submission = groupData?.submission
  const alreadySubmitted = submission?.status === 'submitted' || submission?.status === 'graded'
  const myName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'Anda'
  const members = groupData?.members ?? []

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-pulse">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 h-36" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 h-96" />
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 h-96" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="max-w-6xl mx-auto py-16 text-center text-slate-500 dark:text-slate-400">
        <p className="font-medium">Terjadi kesalahan saat memuat data kelompok.</p>
      </div>
    )
  }

  if (!groupData) {
    return (
      <div className="max-w-6xl mx-auto py-16 flex flex-col items-center justify-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm text-center px-6">
        <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-indigo-400 dark:text-indigo-500" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
          Belum ada kelompok
        </h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm">
          Anda belum ditempatkan ke grup untuk tugas ini. Hubungi guru Anda untuk informasi lebih
          lanjut.
        </p>
        <Link
          to="/assignments"
          className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Tugas
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-3xl -mr-20 -mt-20 opacity-50 pointer-events-none" />
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
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
              {groupData.group.name}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {members.length} dari {groupData.group.max_members} anggota
            </p>
            {submission && (
              <div className="mt-3">
                {submission.status === 'graded' && submission.grade !== null ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Dinilai — Nilai: {submission.grade}
                  </span>
                ) : submission.status === 'submitted' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Sudah Diserahkan
                  </span>
                ) : null}
              </div>
            )}
          </div>
          <div className="shrink-0">
            {!alreadySubmitted && (
              <button
                onClick={() => setIsSubmitting(true)}
                disabled={tasks.length === 0}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:dark:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors shadow-sm shadow-indigo-200"
              >
                Serahkan Tugas Kelompok
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Tabs + Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tab bar */}
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

          {/* Tab panels */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
            {activeTab === 'workspace' && (
              <div className="p-6 flex flex-col flex-1">
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
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Dokumen kolaborasi akan tersedia setelah tugas kelompok dibuat oleh guru.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'tasks' && (
              <GroupTasksTab
                tasks={tasks}
                newTaskTitle={newTaskTitle}
                onToggleStatus={toggleTaskStatus}
                onTaskTitleChange={setNewTaskTitle}
                onAddTask={handleAddTask}
              />
            )}

            {activeTab === 'peer_review' && (
              <div className="p-6 flex flex-col flex-1">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Penilaian Sejawat
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Nilai kontribusi anggota kelompok Anda. Penilaian ini bersifat rahasia.
                  </p>
                </div>
                {members.length > 0 ? (
                  <div className="space-y-3">
                    {members
                      .filter((m) => m.user_id !== user?.id)
                      .map((member) => (
                        <div
                          key={member.user_id}
                          className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                              {member.display_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                                {member.display_name}
                              </p>
                              {member.role === 'leader' && (
                                <span className="text-[10px] text-indigo-500 font-bold uppercase">
                                  Ketua
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                            Segera tersedia
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <Users className="w-10 h-10 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                    <p className="font-medium">Belum ada anggota kelompok.</p>
                    <p className="text-sm mt-1">
                      Penilaian sejawat tersedia setelah kelompok dibentuk.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Members + Chat */}
        <div className="lg:col-span-1 space-y-4">
          {/* Members card */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" />
              Anggota Kelompok
            </h3>
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.user_id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs shrink-0">
                    {member.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                      {member.display_name}
                      {member.user_id === user?.id && (
                        <span className="ml-1 text-[10px] text-slate-400">(Anda)</span>
                      )}
                    </p>
                    {member.role === 'leader' && (
                      <p className="text-[10px] text-indigo-500 font-bold uppercase">Ketua</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <GroupChatPanel
            chat={chat}
            myName={myName}
            newMessage={newMessage}
            onMessageChange={setNewMessage}
            onSend={handleSendMessage}
          />
        </div>
      </div>

      <AnimatePresence>
        {isSubmitting && (
          <SubmitGroupModal
            isPending={submitMutation.isPending}
            onCancel={() => setIsSubmitting(false)}
            onConfirm={handleConfirmSubmit}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
