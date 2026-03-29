import { valibotResolver } from '@hookform/resolvers/valibot'
import { ArrowLeft, Loader2, Plus, X } from 'lucide-react'
import { useEffect } from 'react'
import { type Resolver,useForm } from 'react-hook-form'

import { ClassDetailPanel } from '@/src/features/classroom/components/ClassDetailPanel'
import { ClassListPanel } from '@/src/features/classroom/components/ClassListPanel'

import { useClassManagementState } from '@/src/features/classroom/hooks/useClassManagementState'
import { type ClassroomFormData,ClassroomFormSchema } from '@/src/shared/schemas/forms'

export function ClassManagement() {
  const s = useClassManagementState()

  const {
    register,
    handleSubmit,
    reset,
    setFocus,
    formState: { errors },
  } = useForm<ClassroomFormData>({
    resolver: (valibotResolver(ClassroomFormSchema) as unknown) as Resolver<ClassroomFormData>,
    defaultValues: { name: '', description: '', subject: '' },
  })

  // Auto-focus name field when form opens
  useEffect(() => {
    if (s.showCreateForm) {
      setFocus('name')
    }
  }, [s.showCreateForm, setFocus])

  const onSubmit = async (data: ClassroomFormData) => {
    // Sync value into hook state so existing handleCreateClass logic works
    s.setNewClassName(data.name.trim())
    await s.handleCreateClass()
    reset()
    s.setShowCreateForm(false)
  }

  const handleClose = () => {
    reset()
    s.setNewClassName('')
    s.setShowCreateForm(false)
  }

  return (
    <div className="max-w-7xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => s.navigate('/teacher-dashboard')}
            aria-label="Kembali ke dashboard"
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
          onClick={() => s.setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-bold rounded-xl text-sm transition-all shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          Buat Kelas Baru
        </button>
      </div>

      {/* Create Class Form */}
      {s.showCreateForm && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-5 mb-6 space-y-3"
          noValidate
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
            <div className="flex-1 w-full">
              <label
                htmlFor="class-name"
                className="block text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1.5 uppercase tracking-wider"
              >
                Nama Kelas Baru
              </label>
              <input
                id="class-name"
                type="text"
                {...register('name')}
                placeholder="Contoh: Kelas 8A, Bahasa Inggris XI-IPA"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'class-name-error' : undefined}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 aria-[invalid=true]:border-red-400"
              />
              {errors.name && (
                <p id="class-name-error" className="mt-1 text-xs text-red-500">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="submit"
                disabled={s.isCreating}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 dark:bg-indigo-500 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 transition-colors"
              >
                {s.isCreating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Buat
              </button>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Tutup formulir"
                className="p-2.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        <ClassListPanel
          filteredClassrooms={s.filteredClassrooms}
          selectedClassId={s.selectedClassId}
          studentCounts={s.studentCounts}
          classLoading={s.classLoading}
          searchQuery={s.searchQuery}
          onSearchChange={s.setSearchQuery}
          onSelectClass={s.setSelectedClassId}
        />

        <ClassDetailPanel
          selectedClass={s.selectedClass}
          students={s.students}
          studentCounts={s.studentCounts}
          loadingStudents={s.loadingStudents}
          renamingClassId={s.renamingClassId}
          renameValue={s.renameValue}
          copiedId={s.copiedId}
          onSetRenamingClassId={s.setRenamingClassId}
          onSetRenameValue={s.setRenameValue}
          onHandleRename={s.handleRename}
          onDeleteClass={s.handleDeleteClass}
          onHandleCopy={s.handleCopy}
          onSetActiveClassroomId={s.setActiveClassroomId}
          onNavigate={s.navigate}
          onRemoveStudent={s.handleRemoveStudent}
        />
      </div>


    </div>
  )
}
