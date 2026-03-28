import {
  BookOpen,
  Check,
  ChevronRight,
  Copy,
  Link as LinkIcon,
  Loader2,
  Pencil,
  Settings2,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react'

import type { EnrolledStudent } from '@/src/features/classroom/hooks/useClassManagementState'

interface SelectedClass {
  id: string
  name: string
  join_code: string
  created_at: string
}

interface ClassDetailPanelProps {
  selectedClass: SelectedClass | undefined
  students: EnrolledStudent[]
  studentCounts: Record<string, number>
  loadingStudents: boolean
  renamingClassId: string | null
  renameValue: string
  copiedId: string | null
  onSetRenamingClassId: (id: string | null) => void
  onSetRenameValue: (value: string) => void
  onHandleRename: (classId: string) => void
  onSetClassToDelete: (id: string) => void
  onHandleCopy: (text: string, id: string) => void
  onSetActiveClassroomId: (id: string) => void
  onNavigate: (path: string) => void
  onRemoveStudent: (student: EnrolledStudent) => void
}

export function ClassDetailPanel({
  selectedClass,
  students,
  studentCounts,
  loadingStudents,
  renamingClassId,
  renameValue,
  copiedId,
  onSetRenamingClassId,
  onSetRenameValue,
  onHandleRename,
  onSetClassToDelete,
  onHandleCopy,
  onSetActiveClassroomId,
  onNavigate,
  onRemoveStudent,
}: ClassDetailPanelProps) {
  if (!selectedClass) {
    return (
      <div className="flex-1 min-w-0">
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl">
          <Settings2 className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-medium text-slate-500 dark:text-slate-400">
            Pilih kelas untuk melihat detail
          </p>
          <p className="text-sm mt-1">Pilih kelas dari panel kiri untuk mengelolanya.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 min-w-0">
      <div className="space-y-5">
        {/* Class Header Card */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {renamingClassId === selectedClass.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      onSetRenameValue(e.target.value)
                    }
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                      e.key === 'Enter' && onHandleRename(selectedClass.id)
                    }
                    autoFocus
                    className="text-xl font-bold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 flex-1"
                  />
                  <button
                    onClick={() => onHandleRename(selectedClass.id)}
                    aria-label="Konfirmasi perubahan nama"
                    className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onSetRenamingClassId(null)}
                    aria-label="Batalkan perubahan nama"
                    className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {selectedClass.name}
                  </h2>
                  <button
                    onClick={() => {
                      onSetRenamingClassId(selectedClass.id)
                      onSetRenameValue(selectedClass.name)
                    }}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                    title="Rename"
                    aria-label="Ubah nama kelas"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Dibuat{' '}
                {new Date(selectedClass.created_at).toLocaleDateString('id-ID', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <button
              onClick={() => onSetClassToDelete(selectedClass.id)}
              className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors"
              title="Hapus kelas"
              aria-label="Hapus kelas"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Stats & Join Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                Siswa Aktif
              </p>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" />
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100">
                  {studentCounts[selectedClass.id] ?? 0}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 sm:col-span-2">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                Kode Gabung
              </p>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-[0.2em]">
                  {selectedClass.join_code}
                </span>
                <div className="flex gap-1.5 ml-auto">
                  <button
                    onClick={() =>
                      onHandleCopy(selectedClass.join_code, 'code-' + selectedClass.id)
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-600 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium text-xs rounded-lg transition-colors"
                  >
                    {copiedId === 'code-' + selectedClass.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    {copiedId === 'code-' + selectedClass.id ? 'Tersalin!' : 'Salin Kode'}
                  </button>
                  <button
                    onClick={() =>
                      onHandleCopy(
                        `${window.location.origin}/dashboard?join=${selectedClass.join_code}`,
                        'link-' + selectedClass.id
                      )
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-600 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium text-xs rounded-lg transition-colors"
                  >
                    {copiedId === 'link-' + selectedClass.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <LinkIcon className="w-3.5 h-3.5" />
                    )}
                    {copiedId === 'link-' + selectedClass.id ? 'Tersalin!' : 'Salin Link'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <button
              onClick={() => {
                onSetActiveClassroomId(selectedClass.id)
                onNavigate('/teaching/quiz-manager')
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Kuis Kelas
              <ChevronRight className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                onSetActiveClassroomId(selectedClass.id)
                onNavigate('/assignments')
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Tugas Kelas
              <ChevronRight className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                onSetActiveClassroomId(selectedClass.id)
                onNavigate('/analytics')
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-bold text-xs rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Analitik
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-indigo-500" />
              Daftar Siswa Terdaftar
            </h3>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-full">
              {students.length} siswa
            </span>
          </div>

          {loadingStudents ? (
            <div className="flex items-center justify-center py-12 text-slate-400 dark:text-slate-500 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Memuat siswa...</span>
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
              <Users className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Belum ada siswa
              </p>
              <p className="text-xs mt-1">Bagikan kode gabung untuk mengundang siswa.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                    {student.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                      {student.full_name}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                      {student.email}
                    </p>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium shrink-0 hidden sm:block">
                    Bergabung{' '}
                    {new Date(student.enrolled_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                  <button
                    onClick={() => onRemoveStudent(student)}
                    className="p-2 text-slate-300 dark:text-slate-600 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors shrink-0"
                    title="Keluarkan dari kelas"
                    aria-label="Keluarkan dari kelas"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
