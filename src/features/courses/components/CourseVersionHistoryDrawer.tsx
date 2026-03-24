import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { AlertTriangle, CheckCircle, Clock, History, Loader2, Save, X } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/src/utils/cn'

import { useCourseVersions, useRestoreVersion, useSaveVersion } from '../queries/useCourseVersions'

interface CourseVersionHistoryDrawerProps {
  isOpen: boolean
  onClose: () => void
  courseId: string
}

export function CourseVersionHistoryDrawer({
  isOpen,
  onClose,
  courseId,
}: CourseVersionHistoryDrawerProps) {
  const { data: versions, isLoading: isLoadingVersions } = useCourseVersions(courseId)
  const saveVersionMutation = useSaveVersion()
  const restoreVersionMutation = useRestoreVersion()

  const [commitMessage, setCommitMessage] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSaveVersion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commitMessage.trim()) return

    await saveVersionMutation.mutateAsync({ courseId, message: commitMessage })
    setCommitMessage('')
    setIsCreating(false)
  }

  const handleRestore = async (versionId: string) => {
    await restoreVersionMutation.mutateAsync(versionId)
    setConfirmRestoreId(null)
    onClose() // Close drawer after restoring to let user see the changes
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 text-slate-800 dark:text-white">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
              <History className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-lg font-bold">Riwayat Versi</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* Create Checkpoint Section */}
          {!isCreating ? (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 font-medium hover:border-indigo-400 hover:text-indigo-600 dark:hover:border-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
            >
              <Save className="w-4 h-4" />
              Buat Checkpoint Baru
            </button>
          ) : (
            <form
              onSubmit={handleSaveVersion}
              className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700"
            >
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Pesan Checkpoint
              </label>
              <input
                type="text"
                autoFocus
                placeholder="Misal: Menambahkan kuis bab 1"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
                disabled={saveVersionMutation.isPending}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  disabled={saveVersionMutation.isPending}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!commitMessage.trim() || saveVersionMutation.isPending}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg flex items-center gap-2 disabled:opacity-50"
                >
                  {saveVersionMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Simpan
                </button>
              </div>
            </form>
          )}

          <div className="h-px bg-slate-100 dark:bg-slate-800" />

          {/* Timeline */}
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-4 uppercase tracking-wider">
              Linimasa Versi
            </h3>

            {isLoadingVersions ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
              </div>
            ) : !versions?.length ? (
              <div className="text-center p-8 text-slate-500 dark:text-slate-400 text-sm">
                Belum ada riwayat versi untuk kursus ini.
              </div>
            ) : (
              <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-3 space-y-8 pb-8">
                {versions.map((version, index) => (
                  <div key={version.id} className="relative pl-6">
                    {/* Timeline Dot */}
                    <div
                      className={cn(
                        'absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2',
                        index === 0
                          ? 'bg-indigo-500 border-white dark:border-slate-900 shadow-[0_0_0_2px_rgba(99,102,241,0.2)]'
                          : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600'
                      )}
                    />

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          v{version.version_number}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <Clock className="w-3 h-3" />
                          {format(new Date(version.created_at), 'dd MMM yyyy, HH:mm', {
                            locale: id,
                          })}
                        </span>
                      </div>

                      <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">
                        {version.commit_message || 'Checkpoint otomatis'}
                      </p>

                      {index !== 0 && confirmRestoreId !== version.id && (
                        <button
                          onClick={() => setConfirmRestoreId(version.id)}
                          className="mt-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 self-start text-left flex items-center gap-1"
                        >
                          Restore ke versi ini
                        </button>
                      )}

                      {/* Restore Confirmation */}
                      {confirmRestoreId === version.id && (
                        <div className="mt-3 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                          <div className="flex items-start gap-2 text-red-800 dark:text-red-300 text-xs mb-3">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            <p>
                              Anda yakin ingin kembali ke versi ini? Semua perubahan setelah versi
                              ini akan hilang. Progress siswa pada modul yang dihapus mungkin akan
                              terdampak.
                            </p>
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setConfirmRestoreId(null)}
                              className="px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                              disabled={restoreVersionMutation.isPending}
                            >
                              Batal
                            </button>
                            <button
                              onClick={() => handleRestore(version.id)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-md flex items-center gap-1 disabled:opacity-50"
                              disabled={restoreVersionMutation.isPending}
                            >
                              {restoreVersionMutation.isPending ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <CheckCircle className="w-3 h-3" />
                              )}
                              Ya, Restore
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
