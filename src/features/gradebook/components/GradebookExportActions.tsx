import { FeatureFlagBanner } from "../../../components/FeatureFlagBanner";

/* eslint-disable jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */
/**
 * Gradebook Export Actions Component
 *
 * Provides export buttons for gradebook data with:
 * - Multiple format support (CSV, Excel, PDF)
 * - Loading states with progress indication
 * - Job status monitoring
 * - Download handling
 * - Error states with retry
 */

import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { useState } from 'react'

import { useExportReport } from '@/features/gradebook/hooks/useExportReport'
import { cn } from '@/utils/cn'
import { logger } from '@/utils/logger'

export type ExportFormat = 'csv' | 'excel' | 'pdf'

interface GradebookExportActionsProps {
  courseId?: string
  startDate?: string
  endDate?: string
  className?: string
}

const FORMAT_OPTIONS: {
  value: ExportFormat
  label: string
  icon: typeof FileText
  mimeType: string
}[] = [
  { value: 'csv', label: 'CSV', icon: FileSpreadsheet, mimeType: 'text/csv' },
  { value: 'excel', label: 'Excel', icon: FileSpreadsheet, mimeType: 'application/vnd.ms-excel' },
  { value: 'pdf', label: 'PDF', icon: FileText, mimeType: 'application/pdf' },
]

export function GradebookExportActions({
  courseId,
  startDate,
  endDate,
  className,
}: GradebookExportActionsProps) {
  const [open, setOpen] = useState(false)

  const { exportReport, isLoading, progress, error, reset } = useExportReport({
    onCompleted: (job) => {
      // Auto-download when completed
      if (job.downloadUrl) {
        window.open(job.downloadUrl, '_blank')
      }
    },
  })

  const handleExport = async (format: ExportFormat) => {
    setOpen(false)
    reset()

    try {
      await exportReport('grades', format, {
        course_id: courseId,
        start_date: startDate,
        end_date: endDate,
      })
    } catch (err) {
      logger.error('[GradebookExport] Export failed:', err)
    }
  }

  return (
    <div className={cn('relative', className)}>
      <FeatureFlagBanner feature="reports.export" />
      {/* Export Button */}
      <button
        onClick={() => setOpen(!open)}
        disabled={isLoading}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Memproses...</span>
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            <span>Export</span>
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      {open && !isLoading && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50">
          <div className="p-2 space-y-1">
            {FORMAT_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => handleExport(value)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
              >
                <Icon className="w-4 h-4" />
                <span>Export sebagai {label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading Progress */}
      {isLoading && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Mempersiapkan export...
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{progress}% selesai</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-700 rounded-lg shadow-lg z-50 p-4 space-y-3">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => setOpen(true)}
            className="w-full px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {}
      {/* Click Outside to Close */}
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  )
}

export default GradebookExportActions
