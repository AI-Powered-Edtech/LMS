// SYNC-HINT: {%DOPEN% = {{ and %DCLOSE%} = }}. Sync tool converts automatically.
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  Loader2,
  PenTool,
  Plus,
  RefreshCw,
  Users,
} from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useToast } from '@/src/components/ui'
import { cn } from '@/src/utils/cn'

import { TeacherGroupEntry } from '../../api/groupAssignmentService'
import { useTeacherGroups } from '../../hooks/useGroupAssignments'
import { GradeGroupModal } from './GradeGroupModal'
import { GroupSettingsTab } from './GroupSettingsTab'

interface Props {
  assignmentId: string
}

function statusLabel(status: TeacherGroupEntry['submission_status']) {
  switch (status) {
    case 'graded':
      return {
        label: 'Dinilai',
        cls: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
      }
    case 'submitted':
      return {
        label: 'Diserahkan',
        cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
      }
    case 'draft':
      return {
        label: 'Draft',
        cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
      }
    default:
      return {
        label: 'Belum Mulai',
        cls: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400',
      }
  }
}

export function TeacherGroupView({ assignmentId }: Props) {
  const addToast = useToast((s) => s.addToast)
  const [teacherTab, setTeacherTab] = useState('overview')
  const [gradingGroup, setGradingGroup] = useState<TeacherGroupEntry | null>(null)

  const { data: groups = [], isLoading, isError, refetch } = useTeacherGroups(assignmentId)

  const handleSyncGCR = () => {
    addToast({
      type: 'info',
      message: 'Sinkronisasi Google Classroom belum tersedia. Fitur ini sedang dalam pengembangan.',
    })
  }

  const submittedCount = groups.filter(
    (g) => g.submission_status === 'submitted' || g.submission_status === 'graded'
  ).length

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto py-16 flex items-center justify-center text-slate-500 dark:text-slate-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Memuat data kelompok...</span>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="max-w-6xl mx-auto py-16 text-center text-slate-500 dark:text-slate-400">
        <p className="font-medium">Terjadi kesalahan saat memuat data kelompok.</p>
        <button
          onClick={() => void refetch()}
          className="mt-4 text-sm text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
        >
          Coba lagi
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              to="/assignments"
              className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
              <Users className="w-8 h-8 text-indigo-600" />
              Manajemen Tugas Kelompok
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-2 ml-12">
            Pantau kolaborasi siswa, atur kelompok, dan sinkronisasi dengan Google Classroom.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSyncGCR}
            className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            Sinkronkan GCR
          </button>
          <button
            onClick={() => addToast({ type: 'info', message: 'Pembuatan kelompok manual akan tersedia segera.' })}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2 transition-colors shadow-sm shadow-indigo-200"
          >
            <Plus className="w-5 h-5" />
            Buat Kelompok Baru
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-700">
        {(['overview', 'groups', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setTeacherTab(tab)}
            className={cn(
              'pb-4 px-2 text-sm font-bold transition-colors relative',
              teacherTab === tab
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            )}
          >
            {tab === 'overview' ? 'Ringkasan' : tab === 'groups' ? 'Daftar Kelompok' : 'Pengaturan'}
            {teacherTab === tab && (
              <motion.div
                layoutId="teacherTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full"
              />
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {teacherTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm col-span-1 md:col-span-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">
              Ringkasan Kelompok
            </h3>
            {groups.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                <p className="font-medium">Belum ada aktivitas kelompok.</p>
                <p className="text-sm mt-1">Buat kelompok baru untuk memulai.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {groups.map((group) => {
                  const { label, cls } = statusLabel(group.submission_status)
                  return (
                    <div
                      key={group.group_id}
                      className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                          <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                            {group.group_name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {group.member_count} anggota
                          </p>
                        </div>
                      </div>
                      <span className={cn('px-2.5 py-1 text-xs font-bold rounded-full', cls)}>
                        {label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Statistik</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-500 dark:text-slate-400">Selesai</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {submittedCount}/{groups.length} Kelompok
                  </span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={%DOPEN% width: groups.length > 0 ? `${(submittedCount / groups.length) * 100}%` : '0%' %DCLOSE%}
                  />
                </div>
              </div>
              <div className="pt-2 space-y-2">
                {(['graded', 'submitted', 'draft', 'not_started'] as const).map((s) => {
                  const count = groups.filter((g) => g.submission_status === s).length
                  const { label, cls } = statusLabel(s)
                  return (
                    <div key={s} className="flex items-center justify-between text-sm">
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-bold', cls)}>
                        {label}
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Groups Tab */}
      {teacherTab === 'groups' && (
        <div>
          {groups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groups.map((group) => {
                const { label, cls } = statusLabel(group.submission_status)
                return (
                  <div
                    key={group.group_id}
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col"
                  >
                    <div className="p-5 border-b border-slate-100 dark:border-slate-700">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                          {group.group_name}
                        </h3>
                        <span className={cn('px-2.5 py-1 text-xs font-bold rounded-full shrink-0', cls)}>
                          {label}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                        {group.member_count} anggota
                      </p>
                      <div className="flex -space-x-2">
                        {group.members.slice(0, 5).map((member) => (
                          <div
                            key={member.user_id}
                            title={member.display_name}
                            className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xs font-bold shrink-0"
                          >
                            {member.display_name.charAt(0).toUpperCase()}
                          </div>
                        ))}
                        {group.members.length > 5 && (
                          <div className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 text-xs font-bold">
                            +{group.members.length - 5}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="p-5 bg-slate-50 dark:bg-slate-900/50 flex-1">
                      {group.submission_status === 'graded' && group.grade !== null && (
                        <div className="mb-4 flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            Nilai: {group.grade}
                          </span>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => addToast({ type: 'info', message: 'Fitur pantau segera tersedia.' })}
                          className="flex-1 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                          <Eye className="w-4 h-4" /> Pantau
                        </button>
                        <button
                          onClick={() => setGradingGroup(group)}
                          disabled={group.submission_status === 'not_started' || group.submission_status === 'draft'}
                          className="flex-1 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <PenTool className="w-4 h-4" /> Nilai
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700">
              <Users className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
              <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">
                Belum ada kelompok
              </h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
                Buat kelompok baru atau sinkronisasi dari Google Classroom untuk memulai.
              </p>
              <button
                onClick={() => addToast({ type: 'info', message: 'Pembuatan kelompok manual akan tersedia segera.' })}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-sm"
              >
                <Plus className="w-5 h-5" />
                Buat Kelompok Baru
              </button>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {teacherTab === 'settings' && (
        <GroupSettingsTab
          onSave={() =>
            addToast({ type: 'info', message: 'Pengaturan kelompok akan tersedia segera.' })
          }
        />
      )}

      {gradingGroup && (
        <GradeGroupModal
          group={gradingGroup}
          assignmentId={assignmentId}
          onClose={() => setGradingGroup(null)}
        />
      )}
    </div>
  )
}
