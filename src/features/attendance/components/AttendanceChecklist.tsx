import { CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react'
import { useCallback, useMemo } from 'react'

import type { AttendanceStudentDetail, ClassStudent } from '../types'

const STATUS_OPTIONS: {
  value: AttendanceStudentDetail['status']
  label: string
  icon: typeof CheckCircle
  color: string
  bg: string
  activeBg: string
}[] = [
  {
    value: 'hadir',
    label: 'Hadir',
    icon: CheckCircle,
    color: 'text-green-600 dark:text-green-400',
    bg: 'border-slate-200 dark:border-slate-600',
    activeBg: 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700',
  },
  {
    value: 'sakit',
    label: 'Sakit',
    icon: AlertCircle,
    color: 'text-yellow-600 dark:text-yellow-400',
    bg: 'border-slate-200 dark:border-slate-600',
    activeBg: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700',
  },
  {
    value: 'izin',
    label: 'Izin',
    icon: Clock,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'border-slate-200 dark:border-slate-600',
    activeBg: 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700',
  },
  {
    value: 'alpha',
    label: 'Alpha',
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
    bg: 'border-slate-200 dark:border-slate-600',
    activeBg: 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700',
  },
]

interface AttendanceChecklistProps {
  students: ClassStudent[]
  details: AttendanceStudentDetail[]
  onDetailsChange: (details: AttendanceStudentDetail[]) => void
  disabled?: boolean
}

export function AttendanceChecklist({
  students,
  details,
  onDetailsChange,
  disabled = false,
}: AttendanceChecklistProps) {
  const detailMap = useMemo(() => {
    const map = new Map<string, AttendanceStudentDetail['status']>()
    for (const d of details) {
      map.set(d.student_id, d.status)
    }
    return map
  }, [details])

  const handleStatusChange = useCallback(
    (studentId: string, name: string, status: AttendanceStudentDetail['status']) => {
      const updated = details.filter((d) => d.student_id !== studentId)
      updated.push({ student_id: studentId, name, status })
      onDetailsChange(updated)
    },
    [details, onDetailsChange]
  )

  const handleSetAll = useCallback(
    (status: AttendanceStudentDetail['status']) => {
      const updated = students.map((s) => ({
        student_id: s.student_id,
        name: s.full_name,
        status,
      }))
      onDetailsChange(updated)
    },
    [students, onDetailsChange]
  )

  const counts = useMemo(() => {
    const c = { hadir: 0, sakit: 0, izin: 0, alpha: 0 }
    for (const d of details) {
      if (d.status in c) c[d.status]++
    }
    return c
  }, [details])

  return (
    <div className="space-y-4" data-testid="attendance-checklist">
      {/* Quick actions */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Tandai semua:
        </span>
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleSetAll(opt.value)}
            disabled={disabled}
            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300"
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Summary bar */}
      <div className="flex gap-3 text-xs font-bold">
        <span className="text-green-600 dark:text-green-400">Hadir: {counts.hadir}</span>
        <span className="text-yellow-600 dark:text-yellow-400">Sakit: {counts.sakit}</span>
        <span className="text-blue-600 dark:text-blue-400">Izin: {counts.izin}</span>
        <span className="text-red-600 dark:text-red-400">Alpha: {counts.alpha}</span>
      </div>

      {/* Student list */}
      <div className="divide-y divide-slate-100 dark:divide-slate-700 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
        {students.map((student, idx) => {
          const currentStatus = detailMap.get(student.student_id) ?? 'hadir'
          return (
            <div
              key={student.student_id}
              className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-750/50 transition-colors"
              data-testid={`student-row-${idx}`}
            >
              {/* Student name */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">
                  {idx + 1}
                </span>
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                  {student.full_name}
                </span>
              </div>

              {/* Status buttons */}
              <div className="flex gap-1.5 ml-10 sm:ml-0">
                {STATUS_OPTIONS.map((opt) => {
                  const isActive = currentStatus === opt.value
                  const Icon = opt.icon
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        handleStatusChange(student.student_id, student.full_name, opt.value)
                      }
                      disabled={disabled}
                      className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        isActive
                          ? `${opt.activeBg} ${opt.color}`
                          : `${opt.bg} text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300`
                      }`}
                      title={opt.label}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{opt.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}

        {students.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
            Tidak ada siswa terdaftar di kelas ini.
          </div>
        )}
      </div>
    </div>
  )
}
