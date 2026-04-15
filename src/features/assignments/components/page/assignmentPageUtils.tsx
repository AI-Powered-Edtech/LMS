import { AlertCircle, CheckCircle2 } from 'lucide-react'

export function getStatusBadge(status: string) {
  switch (status) {
    case 'assigned':
      return (
        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold rounded-full">
          Ditugaskan
        </span>
      )
    case 'submitted':
    case 'turned_in':
      return (
        <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Diserahkan
        </span>
      )
    case 'graded':
    case 'returned':
      return (
        <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-bold rounded-full flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Dinilai
        </span>
      )
    case 'late':
      return (
        <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold rounded-full flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Terlambat
        </span>
      )
    default:
      return null
  }
}
