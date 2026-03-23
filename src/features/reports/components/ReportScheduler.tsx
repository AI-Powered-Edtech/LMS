import { Loader2, Save } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/src/utils/cn'

import { useSaveReport } from '../queries/reportQueries'
import type { ExportFormat, ReportSchedule, ReportType } from '../types'

const REPORT_TYPE_OPTIONS: { value: ReportType; label: string }[] = [
  { value: 'student_list', label: 'Daftar Siswa' },
  { value: 'course_summary', label: 'Ringkasan Kursus' },
  { value: 'engagement', label: 'Keterlibatan Siswa' },
]

const SCHEDULE_OPTIONS: { value: ReportSchedule; label: string }[] = [
  { value: 'none', label: 'Manual (tidak terjadwal)' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
]

const FORMAT_OPTIONS: { value: ExportFormat; label: string }[] = [
  { value: 'csv', label: 'CSV' },
  { value: 'pdf', label: 'PDF' },
]

interface ReportSchedulerProps {
  onSaved?: () => void
}

export function ReportScheduler({ onSaved }: ReportSchedulerProps) {
  const [name, setName] = useState('')
  const [reportType, setReportType] = useState<ReportType>('student_list')
  const [schedule, setSchedule] = useState<ReportSchedule>('none')
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv')
  const [saved, setSaved] = useState(false)

  const { mutate: saveReport, isPending } = useSaveReport()

  const handleSave = () => {
    if (!name.trim()) return
    saveReport(
      { name, reportType, schedule, exportFormat },
      {
        onSuccess: () => {
          setSaved(true)
          setName('')
          setTimeout(() => setSaved(false), 2000)
          onSaved?.()
        },
      }
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-6 space-y-4">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">Buat Laporan Baru</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Nama Laporan</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Misal: Daftar Siswa Bulan Ini"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Jenis Laporan</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ReportType)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-400 focus:outline-none"
          >
            {REPORT_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Jadwal</label>
          <select
            value={schedule}
            onChange={(e) => setSchedule(e.target.value as ReportSchedule)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-400 focus:outline-none"
          >
            {SCHEDULE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Format Ekspor</label>
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-indigo-400 focus:outline-none"
          >
            {FORMAT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isPending || !name.trim()}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all',
            saved
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50'
          )}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saved ? 'Tersimpan!' : 'Simpan Laporan'}
        </button>
      </div>
    </div>
  )
}
