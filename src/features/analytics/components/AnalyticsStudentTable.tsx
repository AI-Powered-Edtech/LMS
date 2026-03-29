// SYNC-HINT: {{ = {{ and }} = }}. Sync tool converts automatically.
import { AlertTriangle, Clock, Eye, Filter } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import React from 'react'

import { cn } from '@/src/utils/cn'

interface StudentData {
  student_id: string
  name: string
  progress: number
  last_active: string | null
}

interface AnalyticsStudentTableProps {
  filteredStudents: StudentData[]
  filter: string
  setFilter: (value: string) => void
  expandedRow: string | null
  setExpandedRow: (value: string | null) => void
  getStatus: (progress: number, lastActive: string | null) => string
}

export function AnalyticsStudentTable({
  filteredStudents,
  filter,
  setFilter,
  expandedRow,
  setExpandedRow,
  getStatus,
}: AnalyticsStudentTableProps) {
  return (
    <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
      <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          Daftar Siswa (Terbaik & Berisiko)
        </h2>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-slate-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-2 font-medium"
          >
            <option value="Semua">Semua Status</option>
            <option value="Aman">Aman</option>
            <option value="Pemantauan">Pemantauan</option>
            <option value="Kritis">Kritis</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-sm text-left text-slate-600 dark:text-slate-400">
          <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th scope="col" className="px-6 py-4 font-bold">
                Nama Siswa
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-center">
                Progress
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-center">
                Terakhir Aktif
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-center">
                Saran Intervensi
              </th>
              <th scope="col" className="px-6 py-4 font-bold text-right">
                Detail
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student) => {
                const status = getStatus(student.progress, student.last_active)
                const isKritis = status === 'Kritis'
                const isPemantauan = status === 'Pemantauan'
                const isExpanded = expandedRow === student.student_id

                let relativeDate = '-'
                if (student.last_active) {
                  const diffMs = new Date().getTime() - new Date(student.last_active).getTime()
                  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
                  if (diffDays === 0) relativeDate = 'Hari ini'
                  else if (diffDays === 1) relativeDate = 'Kemarin'
                  else relativeDate = `${diffDays} hari lalu`
                }

                return (
                  <React.Fragment key={student.student_id}>
                    <tr
                      className={cn(
                        'border-b border-slate-100 dark:border-slate-700 transition-colors',
                        isKritis && !isExpanded
                          ? 'bg-red-50/30 dark:bg-red-900/20 hover:bg-red-50/80 dark:hover:bg-red-900/30'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                      )}
                    >
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">
                        {student.name}
                        {isKritis && (
                          <span className="ml-2 inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span
                            className={cn(
                              'font-bold text-base',
                              isKritis ? 'text-red-600' : 'text-slate-700'
                            )}
                          >
                            {Math.round(student.progress)}%
                          </span>
                          <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full',
                                isKritis ? 'bg-red-500' : 'bg-indigo-500'
                              )}
                              style={{ width: `${student.progress}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium',
                            relativeDate === '-' ||
                              (relativeDate.includes('hari lalu') && parseInt(relativeDate) > 7)
                              ? 'bg-red-100 text-red-700'
                              : 'bg-slate-100 text-slate-600'
                          )}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          {relativeDate}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isKritis ? (
                          <span className="text-xs font-medium text-red-600 border border-red-200 bg-red-50 px-2 py-1 rounded">
                            Intervensi Aktif
                          </span>
                        ) : isPemantauan ? (
                          <span className="text-xs font-medium text-amber-600 border border-amber-200 bg-amber-50 px-2 py-1 rounded">
                            Pantau
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                            Aman
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setExpandedRow(isExpanded ? null : student.student_id)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Lihat Detail Log"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.tr
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700"
                        >
                          <td colSpan={5} className="px-6 py-4">
                            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm shadow-sm flex items-start gap-3">
                              <AlertTriangle
                                className={cn(
                                  'w-5 h-5 shrink-0 mt-0.5',
                                  isKritis ? 'text-red-500' : 'text-amber-500'
                                )}
                              />
                              <div>
                                <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                                  Sistem mendeteksi bahwa {student.name}{' '}
                                  {isKritis ? 'sangat tertinggal' : 'sedikit tertinggal'} dari
                                  target kelas.
                                </p>
                                <p className="text-slate-600 dark:text-slate-400 mb-3">
                                  Tingkat penyelesaian kursus: {Math.round(student.progress)}%.
                                  Disarankan untuk menghubungi siswa melalui fitur pesan atau
                                  melakukan check-in pada sesi berikutnya.
                                </p>
                                <button className="text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg transition-colors">
                                  Kirim Pesan Otomatis (Segera Hadir)
                                </button>
                              </div>
                            </div>
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                )
              })
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-8 text-center text-slate-500 dark:text-slate-400"
                >
                  Tidak ada siswa yang sesuai dengan filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
