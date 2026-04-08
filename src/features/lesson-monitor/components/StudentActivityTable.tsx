import { AlertTriangle, Clock, Zap } from 'lucide-react'

import { VirtualTable } from '@/components/ui/VirtualTable'
import { cn } from '@/utils/cn'

import type { StudentActivityData } from '../types'

interface StudentActivityTableProps {
  data: StudentActivityData[]
  isLoading?: boolean
}

export function StudentActivityTable({ data, isLoading }: StudentActivityTableProps) {
  const columns = [
    {
      key: 'student',
      header: 'Siswa',
      render: (row: StudentActivityData) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold">
            {row.studentName.charAt(0).toUpperCase()}
          </div>
          <div>
            <span className="font-bold text-slate-700 dark:text-slate-300">{row.studentName}</span>
            <div className="flex items-center gap-2 mt-1">
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  row.status === 'active'
                    ? 'bg-green-500'
                    : row.status === 'idle'
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                )}
              ></div>
              <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                {row.status === 'active' ? 'Aktif' : row.status === 'idle' ? 'Idle' : 'Tidak Aktif'}
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'currentLesson',
      header: 'Pelajaran Saat Ini',
      render: (row: StudentActivityData) => (
        <span className="text-sm text-slate-700 dark:text-slate-300">
          {row.currentLesson || 'Tidak ada'}
        </span>
      ),
    },
    {
      key: 'progress',
      header: 'Progress',
      render: (row: StudentActivityData) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${row.progress}%` }}
            ></div>
          </div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 min-w-[3ch]">
            {row.progress}%
          </span>
        </div>
      ),
    },
    {
      key: 'timeSpent',
      header: 'Waktu',
      render: (row: StudentActivityData) => (
        <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
          <Clock className="w-4 h-4" />
          <span>{Math.round(row.timeSpent)}m</span>
        </div>
      ),
    },
    {
      key: 'lastActivity',
      header: 'Aktivitas Terakhir',
      render: (row: StudentActivityData) => (
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {new Date(row.lastActivity).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      key: 'alerts',
      header: 'Status',
      render: (row: StudentActivityData) => (
        <div className="flex items-center gap-1">
          {row.alerts.length > 0 ? (
            <div className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-xs font-bold">
              <AlertTriangle className="w-3 h-3" />
              Perlu Bantuan
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-bold">
              <Zap className="w-3 h-3" />
              Lancar
            </div>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 dark:border-slate-700">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Aktivitas Siswa Real-time
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Pantau progress dan status siswa secara langsung
        </p>
      </div>

      <VirtualTable<StudentActivityData>
        data={data}
        columns={columns}
        rowHeight={70}
        maxHeight={500}
        getRowKey={(row) => row.studentId}
        emptyState={
          <div className="px-8 py-12 text-center text-slate-500 dark:text-slate-400 font-medium italic">
            {isLoading ? 'Memuat data aktivitas...' : 'Belum ada data aktivitas siswa.'}
          </div>
        }
      />
    </div>
  )
}
