import { ArrowLeft, ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'

import type { SpeedGraderStudent } from './types'

interface GraderTopBarProps {
  students: SpeedGraderStudent[]
  currentStudentIdx: number
  isLoading: boolean
  onStudentChange: (idx: number) => void
  onPrev: () => void
  onNext: () => void
}

export function GraderTopBar({
  students,
  currentStudentIdx,
  isLoading,
  onStudentChange,
  onPrev,
  onNext,
}: GraderTopBarProps) {
  return (
    <div className="h-auto md:h-16 py-4 md:py-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between px-4 md:px-6 shrink-0 gap-4 md:gap-0 z-20">
      <div className="flex items-center gap-4">
        <Link
          to="/directory"
          className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-slate-800 dark:text-white text-sm md:text-base">
            Speed Grader
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Penilaian Cepat</p>
        </div>
      </div>

      <div className="flex items-center justify-between w-full md:w-auto gap-4">
        <select
          value={currentStudentIdx}
          onChange={(e) => onStudentChange(Number(e.target.value))}
          className="text-sm font-bold text-slate-800 dark:text-white bg-transparent border-none focus:ring-0 cursor-pointer dark:bg-slate-900"
        >
          {students.map((s, idx) => (
            <option key={s.id} value={idx}>
              {idx + 1}. {s.name}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            disabled={currentStudentIdx === 0 || isLoading}
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
          <button
            onClick={onNext}
            disabled={currentStudentIdx === students.length - 1 || isLoading}
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  )
}
