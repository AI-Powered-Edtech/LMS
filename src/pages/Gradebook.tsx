import { ArrowLeft, BookOpen, ChevronDown, Download, Filter, Plus } from 'lucide-react'

import { Breadcrumb, EmptyState } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import type { Course } from '@/features/courses/types'
import { AddAssignmentModal } from '@/features/gradebook/components/AddAssignmentModal'
import { GradebookMainTable } from '@/features/gradebook/components/GradebookMainTable'
import { GradebookStats } from '@/features/gradebook/components/GradebookStats'
import { GradebookTable } from '@/features/gradebook/components/GradebookTable'
import { useGradebookState } from '@/features/gradebook/hooks/useGradebookState'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/utils/cn'

export function Gradebook() {
  const s = useGradebookState()
  const addToast = useToast((s) => s.addToast)
  const { role } = useAuth()
  const dashboardHref = role === 'admin' ? '/app/admin/dashboard' : '/app/teacher/dashboard'

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Breadcrumb
        items={[{ label: 'Dashboard', href: dashboardHref }, { label: 'Nilai' }]}
        className="mb-2"
      />
      {/* Gradebook per Kursus (data Supabase) */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 dark:text-slate-200">Nilai per Kursus</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilih kursus untuk melihat buku nilai lengkap
              </p>
            </div>
          </div>

          <div className="relative">
            <select
              value={s.selectedCourseId}
              onChange={(e) => s.setSelectedCourseId(e.target.value)}
              className={cn(
                'appearance-none pl-3 pr-9 py-2 rounded-xl text-sm font-medium',
                'border border-slate-200 dark:border-slate-600',
                'bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors',
                'min-w-[200px]'
              )}
            >
              <option value="">-- Pilih Kursus --</option>
              {s.courses.map((c: Course) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {s.selectedCourseId ? (
          <GradebookTable courseId={s.selectedCourseId} />
        ) : s.courses.length === 0 ? (
          <EmptyState
            title="Belum ada kursus"
            description="Buat kursus terlebih dahulu untuk mulai mengelola nilai siswa."
          />
        ) : (
          <div className="flex items-center justify-center h-24 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl">
            <p className="text-sm text-slate-400 dark:text-slate-500">
              Pilih kursus di atas untuk menampilkan buku nilai
            </p>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <button
              onClick={() => window.history.back()}
              className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            Buku Nilai
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 ml-2 sm:ml-11 text-sm sm:text-base">
            Kelola dan pantau nilai siswa
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => s.setIsAddModalOpen(true)}
            aria-label="Tambah kolom nilai"
            className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 flex items-center gap-2 text-sm sm:text-base shadow-sm shadow-blue-200 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Tambah Kolom</span>
          </button>
          <button
            type="button"
            aria-label="Filter"
            className="px-3 sm:px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-sm sm:text-base shadow-sm transition-all"
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filter</span>
          </button>
          <button
            type="button"
            onClick={() => addToast({ type: 'info', message: 'Fitur Ekspor CSV segera hadir.' })}
            aria-label="Ekspor CSV"
            className="px-3 sm:px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-sm sm:text-base shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Ekspor CSV</span>
          </button>
        </div>
      </div>

      <AddAssignmentModal
        isOpen={s.isAddModalOpen}
        newAssignment={s.newAssignment}
        onClose={() => s.setIsAddModalOpen(false)}
        onSubmit={s.handleAddAssignment}
        onUpdate={s.setNewAssignment}
      />

      <GradebookStats
        classAverage={s.classAverage}
        highestScore={s.highestScore}
        lowestScore={s.lowestScore}
        highestStudent={s.highestStudent}
        lowestStudent={s.lowestStudent}
      />

      <GradebookMainTable
        filteredStudents={s.filteredStudents}
        assignments={s.assignments}
        grades={s.grades}
        studentStatsMap={s.studentStatsMap}
        editingCell={s.editingCell}
        editValue={s.editValue}
        searchQuery={s.searchQuery}
        onSearchChange={s.setSearchQuery}
        onCellClick={s.handleCellClick}
        onSaveEdit={s.handleSaveEdit}
        onCancelEdit={() => s.setEditingCell(null)}
        onEditValueChange={s.setEditValue}
        onKeyDown={s.handleKeyDown}
      />
    </div>
  )
}
