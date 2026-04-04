import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  ChevronRight,
  Info,
  Loader2,
  Send,
  Shield,
  ThumbsUp,
  Upload,
  X,
  XCircle,
} from 'lucide-react'

import { useAuth } from '@/contexts/AuthContext'
import { useBuilder } from '@/contexts/BuilderContext'
import { cn } from '@/utils/cn'
import { translateCourseStatus } from '@/utils/statusTranslations'

import {
  type CourseAction,
  type ReadinessItem,
  useCourseReadiness,
} from '../hooks/useCourseReadiness'
import type { CourseStatus } from '../types'

// ============================================================
// Sub-components
// ============================================================

function ReadinessItemRow({ item }: { item: ReadinessItem }) {
  const iconMap = {
    blocker: <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />,
    info: <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />,
  }

  const bgMap = {
    blocker: 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/30',
    warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/30',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/30',
  }

  return (
    <div className={cn('flex gap-2.5 p-2.5 rounded-lg border', bgMap[item.severity])}>
      {iconMap[item.severity]}
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-snug">
          {item.message}
        </p>
        {item.hint && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            {item.hint}
          </p>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Status lifecycle nodes
// ============================================================

const STATUS_ORDER: CourseStatus[] = ['draft', 'in_review', 'approved', 'published']

function LifecycleNode({
  status,
  isCurrent,
  isReached,
}: {
  status: CourseStatus
  isCurrent: boolean
  isReached: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-0">
      <div
        className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors',
          isCurrent
            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-indigo-900/30'
            : isReached
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400'
        )}
      >
        {isReached && !isCurrent ? (
          <CheckCircle className="w-4 h-4" />
        ) : (
          <span className="text-[10px] font-black">{STATUS_ORDER.indexOf(status) + 1}</span>
        )}
      </div>
      <span
        className={cn(
          'text-[10px] font-semibold uppercase tracking-wide text-center leading-tight',
          isCurrent
            ? 'text-indigo-600 dark:text-indigo-400'
            : isReached
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-slate-400 dark:text-slate-500'
        )}
      >
        {translateCourseStatus(status)}
      </span>
    </div>
  )
}

function StatusLifecycle({ currentStatus }: { currentStatus: CourseStatus }) {
  const currentIdx = STATUS_ORDER.indexOf(currentStatus)

  return (
    <div className="flex items-start gap-1 py-2">
      {STATUS_ORDER.map((s, idx) => (
        <div key={s} className="flex items-center gap-1 flex-1 min-w-0">
          <LifecycleNode status={s} isCurrent={s === currentStatus} isReached={idx < currentIdx} />
          {idx < STATUS_ORDER.length - 1 && (
            <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0 -mt-4" />
          )}
        </div>
      ))}
    </div>
  )
}

// ============================================================
// Action buttons
// ============================================================

interface ActionButtonsProps {
  availableActions: CourseAction[]
  canPublish: boolean
  isBusy: boolean
  onSubmitReview: () => void
  onApprove: () => void
  onPublish: () => void
  onUnpublish: () => void
  onRevertDraft: () => void
}

function ActionButtons({
  availableActions,
  canPublish,
  isBusy,
  onSubmitReview,
  onApprove,
  onPublish,
  onUnpublish,
  onRevertDraft,
}: ActionButtonsProps) {
  if (availableActions.length === 0) return null

  const btnBase =
    'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed'

  const spinnerOrIcon = (icon: React.ReactNode) =>
    isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : icon

  return (
    <div className="flex flex-col gap-2 mt-1">
      {availableActions.includes('submit_review') && (
        <button
          onClick={onSubmitReview}
          disabled={isBusy}
          className={cn(
            btnBase,
            'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-100 dark:shadow-blue-900/30'
          )}
        >
          {spinnerOrIcon(<Send className="w-4 h-4" />)}
          Ajukan untuk Ditinjau
        </button>
      )}

      {availableActions.includes('approve') && (
        <button
          onClick={onApprove}
          disabled={isBusy}
          className={cn(
            btnBase,
            'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-100 dark:shadow-emerald-900/30'
          )}
        >
          {spinnerOrIcon(<ThumbsUp className="w-4 h-4" />)}
          Setujui Kursus
        </button>
      )}

      {availableActions.includes('publish') && (
        <button
          onClick={onPublish}
          disabled={isBusy || !canPublish}
          title={!canPublish ? 'Selesaikan semua blocker terlebih dahulu' : undefined}
          className={cn(
            btnBase,
            canPublish
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-100 dark:shadow-indigo-900/30'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
          )}
        >
          {spinnerOrIcon(<Upload className="w-4 h-4" />)}
          {canPublish ? 'Terbitkan Kursus' : 'Terbitkan (ada blocker)'}
        </button>
      )}

      {availableActions.includes('unpublish') && (
        <button
          onClick={onUnpublish}
          disabled={isBusy}
          className={cn(
            btnBase,
            'bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
          )}
        >
          {spinnerOrIcon(<XCircle className="w-4 h-4" />)}
          Batalkan Publikasi
        </button>
      )}

      {availableActions.includes('revert_draft') && (
        <button
          onClick={onRevertDraft}
          disabled={isBusy}
          className={cn(
            btnBase,
            'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
          )}
        >
          {spinnerOrIcon(<ArrowRight className="w-4 h-4 rotate-180" />)}
          Kembalikan ke Draf
        </button>
      )}
    </div>
  )
}

// ============================================================
// Score bar
// ============================================================

function ReadinessScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          Skor Kesiapan
        </span>
        <span
          className={cn(
            'text-sm font-black',
            score >= 80
              ? 'text-emerald-600 dark:text-emerald-400'
              : score >= 50
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-red-600 dark:text-red-400'
          )}
        >
          {score}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}

// ============================================================
// Main Panel
// ============================================================

interface CourseReleasePanelProps {
  onClose: () => void
}

export function CourseReleasePanel({ onClose }: CourseReleasePanelProps) {
  const { state, actions } = useBuilder()
  const { role } = useAuth()

  const assignedClassesCount = 0 // TODO: could be fetched via a lightweight query

  const readiness = useCourseReadiness({
    modules: state.modules,
    courseTitle: state.courseTitle,
    courseDescription: state.courseDescription,
    courseStatus: state.courseStatus,
    role: role as 'student' | 'teacher' | 'admin' | 'parent' | 'principal' | null,
    assignedClassesCount,
  })

  const isBusy = state.savingStatus === 'saving'

  return (
    <aside
      className="w-80 shrink-0 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-200"
      aria-label="Panel Rilis Kursus"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5 text-slate-800 dark:text-white">
          <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
            <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h2 className="text-sm font-bold">Panel Rilis</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          aria-label="Tutup panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
        {/* Readiness Score */}
        <ReadinessScoreBar score={readiness.readinessScore} />

        <div className="h-px bg-slate-100 dark:bg-slate-800" />

        {/* Status Lifecycle */}
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
            Alur Status
          </p>
          <StatusLifecycle currentStatus={state.courseStatus} />
        </div>

        <div className="h-px bg-slate-100 dark:bg-slate-800" />

        {/* Readiness Items */}
        {readiness.allItems.length > 0 && (
          <div className="flex flex-col gap-2">
            {readiness.blockers.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide mb-1.5">
                  Blocker ({readiness.blockers.length})
                </p>
                <div className="flex flex-col gap-1.5">
                  {readiness.blockers.map((item) => (
                    <ReadinessItemRow key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )}

            {readiness.warnings.length > 0 && (
              <div className="mt-1">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1.5">
                  Peringatan ({readiness.warnings.length})
                </p>
                <div className="flex flex-col gap-1.5">
                  {readiness.warnings.map((item) => (
                    <ReadinessItemRow key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )}

            {readiness.infos.length > 0 && (
              <div className="mt-1">
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1.5">
                  Informasi
                </p>
                <div className="flex flex-col gap-1.5">
                  {readiness.infos.map((item) => (
                    <ReadinessItemRow key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* All clear state */}
        {readiness.blockers.length === 0 && readiness.warnings.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-3 text-center">
            <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              Kursus siap diterbitkan
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tidak ada blocker atau peringatan yang ditemukan.
            </p>
          </div>
        )}

        <div className="h-px bg-slate-100 dark:bg-slate-800" />

        {/* Action Buttons */}
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
            Aksi Tersedia
          </p>
          <ActionButtons
            availableActions={readiness.availableActions}
            canPublish={readiness.canPublish}
            isBusy={isBusy}
            onSubmitReview={() => actions.submitForReview()}
            onApprove={() => actions.approveCourse()}
            onPublish={() => actions.publishCourse()}
            onUnpublish={() => actions.draftCourse()}
            onRevertDraft={() => actions.draftCourse()}
          />

          {readiness.availableActions.length === 0 && (
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-2">
              Tidak ada aksi yang tersedia untuk role Anda saat ini.
            </p>
          )}
        </div>
      </div>
    </aside>
  )
}
