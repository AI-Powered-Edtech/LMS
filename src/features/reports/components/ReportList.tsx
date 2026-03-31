import { Calendar, FileText, Loader2, Play, Trash2 } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'

import { cn } from '@/utils/cn'

import { useDeleteReport, useGenerateReportData, useReports } from '../queries/reportQueries'
import type { ScheduledReport } from '../types'
import { ExportButton } from './ExportButton'

const REPORT_TYPE_LABELS: Record<string, string> = {
  dashboard: 'Dasbor',
  student_list: 'Daftar Siswa',
  course_summary: 'Ringkasan Kursus',
  engagement: 'Keterlibatan',
}

const SCHEDULE_LABELS: Record<string, string> = {
  none: 'Manual',
  weekly: 'Mingguan',
  monthly: 'Bulanan',
}

export function ReportList() {
  const { data: reports, isLoading } = useReports()
  const { mutate: deleteReport, isPending: isDeleting } = useDeleteReport()
  const { mutate: generateData, isPending: isGenerating } = useGenerateReportData()
  const [generatedData, setGeneratedData] = useState<Record<string, Record<string, unknown>[]>>({})
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [generatingId, setGeneratingId] = useState<string | null>(null)

  const handleDelete = (id: string) => {
    if (!confirm('Hapus laporan ini?')) return
    setDeletingId(id)
    deleteReport(id, { onSettled: () => setDeletingId(null) })
  }

  const handleGenerate = (report: ScheduledReport) => {
    setGeneratingId(report.id)
    generateData(report.id, {
      onSuccess: (data) => {
        setGeneratedData((prev) => ({ ...prev, [report.id]: data }))
        setGeneratingId(null)
      },
      onError: () => setGeneratingId(null),
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  const list = reports ?? []

  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
        <FileText className="h-10 w-10" />
        <p className="text-sm font-medium">Belum ada laporan tersimpan</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {list.map((report, i) => {
        const reportData = generatedData[report.id]
        return (
          <motion.div
            key={report.id}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-slate-800 dark:text-white text-sm">
                  {report.name}
                </h4>
                <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                  {REPORT_TYPE_LABELS[report.report_type] ?? report.report_type}
                </span>
                <span
                  className={cn(
                    'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                    report.schedule === 'none'
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  )}
                >
                  <Calendar className="h-3 w-3" />
                  {SCHEDULE_LABELS[report.schedule]}
                </span>
              </div>
              {report.last_generated_at && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Terakhir dibuat: {new Date(report.last_generated_at).toLocaleDateString('id-ID')}
                </p>
              )}
              {reportData && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                  {reportData.length} baris data siap
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleGenerate(report)}
                disabled={isGenerating && generatingId === report.id}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-200 disabled:opacity-50 transition-colors"
              >
                {isGenerating && generatingId === report.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                Buat Data
              </button>

              {reportData && reportData.length > 0 && (
                <ExportButton
                  data={reportData}
                  filename={report.name.replace(/\s+/g, '_').toLowerCase()}
                  format={report.export_format}
                  label="Unduh"
                  className="text-xs py-1.5"
                />
              )}

              <button
                onClick={() => handleDelete(report.id)}
                disabled={isDeleting && deletingId === report.id}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
              >
                {isDeleting && deletingId === report.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
