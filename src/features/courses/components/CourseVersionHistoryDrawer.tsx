import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  Clock,
  GitCompare,
  History,
  Loader2,
  MinusCircle,
  PlusCircle,
  Save,
  X,
} from 'lucide-react'
import { useState } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { useBuilder } from '@/contexts/BuilderContext'
import type { DomainModule } from '@/shared/types/moduleTypes'
import { cn } from '@/utils/cn'

import {
  computeVersionDiff,
  type ImpactLevel,
  type VersionDiff,
  versionService,
  type VersionSnapshotModule,
} from '../api/versionService'
import { useCourseVersions, useRestoreVersion, useSaveVersion } from '../queries/useCourseVersions'

// ============================================================
// Diff preview sub-components
// ============================================================

function ImpactBadge({ level }: { level: ImpactLevel }) {
  const config = {
    low: {
      label: 'Dampak Rendah',
      cls: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    },
    medium: {
      label: 'Dampak Sedang',
      cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    },
    high: {
      label: 'Dampak Tinggi',
      cls: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    },
  }
  const { label, cls } = config[level]
  return <span className={cn('text-xs font-bold px-2.5 py-0.5 rounded-full', cls)}>{label}</span>
}

interface DiffPreviewProps {
  diff: VersionDiff
  versionNumber: number
  isRestoring: boolean
  onConfirm: () => void
  onCancel: () => void
}

function DiffPreview({ diff, versionNumber, isRestoring, onConfirm, onCancel }: DiffPreviewProps) {
  const hasChanges =
    diff.restoredModules.length > 0 ||
    diff.lostModules.length > 0 ||
    diff.addedLessonCount > 0 ||
    diff.removedLessonCount > 0 ||
    diff.modifiedModuleTitles.length > 0

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          onClick={onCancel}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500"
          aria-label="Kembali ke daftar versi"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-bold text-slate-800 dark:text-white">
            Pratinjau Perubahan — v{versionNumber}
          </span>
        </div>
      </div>

      {/* Impact badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <ImpactBadge level={diff.impactLevel} />
        {diff.removedLessonCount > 0 && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {diff.removedLessonCount} pelajaran akan dihapus dari versi saat ini
          </span>
        )}
      </div>

      {!hasChanges ? (
        <div className="text-center py-4 text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
          Tidak ada perubahan struktural yang terdeteksi antara versi ini dan versi saat ini.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Restored modules (in snapshot but not in current) */}
          {diff.restoredModules.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <PlusCircle className="w-3.5 h-3.5" />
                Modul yang dikembalikan ({diff.restoredModules.length})
              </p>
              <div className="flex flex-col gap-1">
                {diff.restoredModules.map((m) => (
                  <div
                    key={m.id}
                    className="flex justify-between items-center text-sm bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 rounded-lg px-3 py-1.5"
                  >
                    <span className="font-medium text-emerald-700 dark:text-emerald-300 truncate">
                      {m.title}
                    </span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 shrink-0 ml-2">
                      {m.lessons.length} pelajaran
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lost modules (exist now but not in snapshot) */}
          {diff.lostModules.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <MinusCircle className="w-3.5 h-3.5" />
                Modul yang akan dihapus ({diff.lostModules.length})
              </p>
              <div className="flex flex-col gap-1">
                {diff.lostModules.map((m) => (
                  <div
                    key={m.id}
                    className="flex justify-between items-center text-sm bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-lg px-3 py-1.5"
                  >
                    <span className="font-medium text-red-700 dark:text-red-300 truncate">
                      {m.title}
                    </span>
                    <span className="text-xs text-red-600 dark:text-red-400 shrink-0 ml-2">
                      {m.lessons.length} pelajaran
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lesson count summary */}
          {(diff.addedLessonCount > 0 || diff.removedLessonCount > 0) && (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2 text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
              {diff.addedLessonCount > 0 && (
                <p className="text-emerald-700 dark:text-emerald-400">
                  + {diff.addedLessonCount} pelajaran akan ditambahkan
                </p>
              )}
              {diff.removedLessonCount > 0 && (
                <p className="text-red-700 dark:text-red-400">
                  − {diff.removedLessonCount} pelajaran dari versi saat ini akan dihapus
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Warning */}
      <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-lg p-3">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
          Semua perubahan setelah versi ini akan hilang. Progress siswa pada modul yang dihapus
          mungkin terdampak.
        </p>
      </div>

      {/* Confirm / Cancel */}
      <div className="flex gap-2 mt-1">
        <button
          onClick={onCancel}
          disabled={isRestoring}
          className="flex-1 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 disabled:opacity-50"
        >
          Batal
        </button>
        <button
          onClick={onConfirm}
          disabled={isRestoring}
          className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          {isRestoring ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          Restore
        </button>
      </div>
    </div>
  )
}

// ============================================================
// Drawer view state
// ============================================================

type DrawerView =
  | { type: 'list' }
  | { type: 'loading_diff'; versionId: string }
  | { type: 'diff'; versionId: string; versionNumber: number; diff: VersionDiff }

// ============================================================
// Main Drawer
// ============================================================

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
  const { tenantId } = useAuth()
  const { state } = useBuilder()
  const { data: versions, isLoading: isLoadingVersions } = useCourseVersions(courseId)
  const saveVersionMutation = useSaveVersion()
  const restoreVersionMutation = useRestoreVersion()

  const [commitMessage, setCommitMessage] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [drawerView, setDrawerView] = useState<DrawerView>({ type: 'list' })
  const [diffError, setDiffError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSaveVersion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commitMessage.trim()) return
    await saveVersionMutation.mutateAsync({ courseId, message: commitMessage })
    setCommitMessage('')
    setIsCreating(false)
  }

  const handlePreviewDiff = async (versionId: string, versionNumber: number) => {
    if (!tenantId) return

    setDiffError(null)
    setDrawerView({ type: 'loading_diff', versionId })

    try {
      const snapshotModules = await versionService.fetchVersionSnapshot(versionId, tenantId)

      // Convert builder DomainModule → VersionSnapshotModule for comparison
      const currentModules: VersionSnapshotModule[] = state.modules.map((m: DomainModule) => ({
        id: m.id,
        title: m.title,
        order: m.orderIndex,
        lessons: (m.lessons ?? []).map((l) => ({
          id: l.id,
          title: l.title,
          is_published: l.isPublished,
        })),
      }))

      const diff = computeVersionDiff(currentModules, snapshotModules)
      setDrawerView({ type: 'diff', versionId, versionNumber, diff })
    } catch {
      setDiffError('Gagal memuat pratinjau perubahan. Coba lagi.')
      setDrawerView({ type: 'list' })
    }
  }

  const handleConfirmRestore = async () => {
    if (drawerView.type !== 'diff') return
    try {
      await restoreVersionMutation.mutateAsync({
        versionId: drawerView.versionId,
        courseId,
      })
      setDrawerView({ type: 'list' })
      onClose()
    } catch {
      // toast shown by onError — reset to list view but drawer stays open
      setDrawerView({ type: 'list' })
    }
  }

  const handleClose = () => {
    setDrawerView({ type: 'list' })
    setDiffError(null)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        role="presentation"
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3 text-slate-800 dark:text-white">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
              <History className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-lg font-bold">Riwayat Versi</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* ── Diff Loading ── */}
          {drawerView.type === 'loading_diff' && (
            <div className="flex flex-col items-center gap-3 py-12">
              <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Memuat pratinjau perubahan...
              </p>
            </div>
          )}

          {/* ── Diff Preview ── */}
          {drawerView.type === 'diff' && (
            <DiffPreview
              diff={drawerView.diff}
              versionNumber={drawerView.versionNumber}
              isRestoring={restoreVersionMutation.isPending}
              onConfirm={handleConfirmRestore}
              onCancel={() => setDrawerView({ type: 'list' })}
            />
          )}

          {/* ── List View ── */}
          {drawerView.type === 'list' && (
            <>
              {/* Diff load error */}
              {diffError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">
                  {diffError}
                </div>
              )}

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

                          {index !== 0 && (
                            <button
                              onClick={() => handlePreviewDiff(version.id, version.version_number)}
                              className="mt-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 self-start text-left flex items-center gap-1.5"
                            >
                              <GitCompare className="w-3.5 h-3.5" />
                              Pratinjau & Restore ke versi ini
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
