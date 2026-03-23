import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  Copy,
  Hash,
  Link as LinkIcon,
  Loader2,
  Pencil,
  Plus,
  Search,
  Settings2,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/src/contexts/AuthContext'
import { classroomService } from '@/src/features/classroom/api/classroomService'
import { useClassroom } from '@/src/features/classroom/hooks/useClassroomQueries'
import { usePageTitle } from '@/src/hooks/usePageTitle'
import { useToast } from '@/src/hooks/useToast'
import { supabase } from '@/src/services/supabase/client'
import { cn } from '@/src/utils/cn'

interface EnrolledStudent {
  id: string
  student_id: string
  full_name: string
  email: string
  enrolled_at: string
  status: string
}

export function ClassManagement() {
  usePageTitle('Class Management')
  const addToast = useToast((s) => s.addToast)
  const navigate = useNavigate()
  const {
    classrooms,
    addClassroom,
    updateClassroom,
    setActiveClassroomId,
    loading: classLoading,
  } = useClassroom()
  const { tenantId, user } = useAuth()

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [students, setStudents] = useState<EnrolledStudent[]>([])
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({})
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Create class
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newClassName, setNewClassName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // Rename
  const [renamingClassId, setRenamingClassId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const selectedClass = classrooms.find((c) => c.id === selectedClassId)

  // Fetch student counts for all classes
  useEffect(() => {
    if (!tenantId || classrooms.length === 0) return

    const fetchCounts = async () => {
      const classIds = classrooms.map((c) => c.id)
      const { data, error } = await supabase
        .from('enrollments')
        .select('class_id')
        .eq('tenant_id', tenantId)
        .eq('status', 'ACTIVE')
        .in('class_id', classIds)

      if (!error && data) {
        const counts = data.reduce(
          (acc: Record<string, number>, curr: { class_id: string }) => {
            acc[curr.class_id] = (acc[curr.class_id] || 0) + 1
            return acc
          },
          {} as Record<string, number>
        )

        const finalCounts = classrooms.reduce(
          (acc, cls) => {
            acc[cls.id] = counts[cls.id] || 0
            return acc
          },
          {} as Record<string, number>
        )

        setStudentCounts(finalCounts)
      }
    }
    fetchCounts()
  }, [classrooms, tenantId])

  // Fetch enrolled students for selected class
  const fetchStudents = useCallback(
    async (classId: string) => {
      if (!tenantId) return
      setLoadingStudents(true)
      try {
        const { data: enrollmentData, error: enrollmentError } = await supabase
          .from('enrollments')
          .select(
            `
          id,
          joined_at,
          student:profiles!enrollments_student_id_fkey(id, full_name, email)
        `
          )
          .eq('class_id', classId)
          .eq('tenant_id', tenantId)
          .eq('status', 'ACTIVE')
        if (enrollmentError) throw enrollmentError // Changed `error` to `enrollmentError`

        setStudents(
          (enrollmentData || []).map(
            (e: {
              id: string
              joined_at: string
              student:
                | { id: string; full_name: string; email: string }
                | { id: string; full_name: string; email: string }[]
            }) => {
              const student = Array.isArray(e.student) ? e.student[0] : e.student
              return {
                id: e.id,
                student_id: student?.id ?? '',
                full_name: student?.full_name || 'Unnamed',
                email: student?.email || '-',
                enrolled_at: e.joined_at,
                status: 'ACTIVE' as const,
              }
            }
          )
        )
      } catch (err) {
        if (import.meta.env.DEV) console.error('Failed to fetch students:', err)
        setStudents([])
      } finally {
        setLoadingStudents(false)
      }
    },
    [tenantId]
  )

  useEffect(() => {
    if (selectedClassId) fetchStudents(selectedClassId)
  }, [selectedClassId, fetchStudents])

  // Auto-select first class
  useEffect(() => {
    if (!selectedClassId && classrooms.length > 0) {
      setSelectedClassId(classrooms[0].id)
    }
  }, [classrooms, selectedClassId])

  const handleCreateClass = async () => {
    if (!newClassName.trim()) return
    setIsCreating(true)
    try {
      await addClassroom(newClassName.trim())
      setNewClassName('')
      setShowCreateForm(false)
    } catch (err: unknown) {
      addToast({
        type: 'error',
        message:
          'Gagal membuat kelas: ' +
          (err instanceof Error ? err.message : 'Kesalahan tidak diketahui'),
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleRename = async (classId: string) => {
    if (!renameValue.trim()) return
    try {
      await updateClassroom(classId, renameValue.trim())
      setRenamingClassId(null)
    } catch (err: unknown) {
      addToast({
        type: 'error',
        message:
          'Gagal mengubah nama: ' +
          (err instanceof Error ? err.message : 'Kesalahan tidak diketahui'),
      })
    }
  }

  const handleDeleteClass = async (classId: string) => {
    if (
      !confirm(
        'Hapus kelas ini? Semua data enrollment akan hilang. Aksi ini tidak bisa dibatalkan.'
      )
    )
      return
    try {
      await classroomService.deleteClassroom(classId)
      if (selectedClassId === classId) setSelectedClassId(null)
    } catch (err: unknown) {
      addToast({
        type: 'error',
        message:
          'Gagal menghapus kelas: ' +
          (err instanceof Error ? err.message : 'Kesalahan tidak diketahui'),
      })
    }
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const filteredClassrooms = classrooms.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/teacher-dashboard')}
            className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Manajemen Kelas
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-sm">
              Kelola kelas, lihat siswa, dan atur pengaturan kelas Anda
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-bold rounded-xl text-sm transition-all shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          Buat Kelas Baru
        </button>
      </div>

      {/* Create Class Form */}
      {showCreateForm && (
        <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-end gap-3">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1.5 uppercase tracking-wider">
              Nama Kelas Baru
            </label>
            <input
              type="text"
              value={newClassName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewClassName(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                e.key === 'Enter' && handleCreateClass()
              }
              placeholder="Contoh: Kelas 8A, Bahasa Inggris XI-IPA"
              autoFocus
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleCreateClass}
              disabled={isCreating || !newClassName.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 dark:bg-indigo-500 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 transition-colors"
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Buat
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false)
                setNewClassName('')
              }}
              className="p-2.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Class List Panel */}
        <div className="w-full lg:w-80 shrink-0 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              placeholder="Cari kelas..."
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          {classLoading ? (
            <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Memuat kelas...</span>
            </div>
          ) : filteredClassrooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <BookOpen className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm font-medium text-slate-500">Belum ada kelas</p>
              <p className="text-xs mt-1">Klik "Buat Kelas Baru" untuk memulai</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredClassrooms.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => setSelectedClassId(cls.id)}
                  className={cn(
                    'w-full text-left p-4 rounded-2xl border transition-all',
                    selectedClassId === cls.id
                      ? 'bg-indigo-50 border-indigo-300 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      className={cn(
                        'font-bold text-sm truncate',
                        selectedClassId === cls.id
                          ? 'text-indigo-700 dark:text-indigo-300'
                          : 'text-slate-800 dark:text-slate-200'
                      )}
                    >
                      {cls.name}
                    </h3>
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0',
                        selectedClassId === cls.id
                          ? 'bg-indigo-200 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                      )}
                    >
                      {cls.name.substring(0, 2).toUpperCase()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {studentCounts[cls.id] ?? '...'} siswa
                    </span>
                    <span className="flex items-center gap-1">
                      <Hash className="w-3 h-3" />
                      {cls.join_code}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Class Detail Panel */}
        <div className="flex-1 min-w-0">
          {!selectedClass ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl">
              <Settings2 className="w-12 h-12 mb-3 opacity-30" />
              <p className="font-medium text-slate-500 dark:text-slate-400">
                Pilih kelas untuk melihat detail
              </p>
              <p className="text-sm mt-1">Pilih kelas dari panel kiri untuk mengelolanya.</p>
            </div>
          ) : (
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
                            setRenameValue(e.target.value)
                          }
                          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                            e.key === 'Enter' && handleRename(selectedClass.id)
                          }
                          autoFocus
                          className="text-xl font-bold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 flex-1"
                        />
                        <button
                          onClick={() => handleRename(selectedClass.id)}
                          className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setRenamingClassId(null)}
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
                            setRenamingClassId(selectedClass.id)
                            setRenameValue(selectedClass.name)
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                          title="Rename"
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
                    onClick={() => handleDeleteClass(selectedClass.id)}
                    className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors"
                    title="Hapus kelas"
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
                            handleCopy(selectedClass.join_code, 'code-' + selectedClass.id)
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
                            handleCopy(
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
                      setActiveClassroomId(selectedClass.id)
                      navigate('/teaching/quiz-manager')
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Kuis Kelas
                    <ChevronRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => {
                      setActiveClassroomId(selectedClass.id)
                      navigate('/assignments')
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Tugas Kelas
                    <ChevronRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => {
                      setActiveClassroomId(selectedClass.id)
                      navigate('/analytics')
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
                          onClick={async () => {
                            if (!confirm(`Keluarkan ${student.full_name} dari kelas ini?`)) return
                            try {
                              const { error } = await supabase
                                .from('enrollments')
                                .update({
                                  status: 'REMOVED',
                                  removed_at: new Date().toISOString(),
                                  removed_by: user?.id,
                                })
                                .eq('id', student.id)
                              if (error) throw error
                              // Refresh student list
                              fetchStudents(selectedClassId!)
                              // Update count
                              setStudentCounts((prev) => ({
                                ...prev,
                                [selectedClassId!]: Math.max((prev[selectedClassId!] || 1) - 1, 0),
                              }))
                            } catch (err: unknown) {
                              addToast({
                                type: 'error',
                                message:
                                  'Gagal mengeluarkan siswa: ' +
                                  (err instanceof Error
                                    ? err.message
                                    : 'Kesalahan tidak diketahui'),
                              })
                            }
                          }}
                          className="p-2 text-slate-300 dark:text-slate-600 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors shrink-0"
                          title="Keluarkan dari kelas"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
