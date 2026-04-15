import { AlertTriangle, CheckCircle, Clock, Loader2 } from 'lucide-react'

import type { PlagiarismStatus } from '../types'

interface PlagiarismBadgeProps {
  score: number | null
  status: PlagiarismStatus | string
}

/**
 * Visual badge displaying plagiarism check result.
 *
 * Color coding:
 *   - pending/processing : gray / blue spinner
 *   - score < 20         : green  — Orisinal
 *   - score 20–50        : yellow — Perlu Ditinjau
 *   - score > 50         : red    — Kemiripan Tinggi
 */
export function PlagiarismBadge({ score, status }: PlagiarismBadgeProps) {
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        Menunggu...
      </span>
    )
  }

  if (status === 'processing') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
        <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
        Memeriksa...
      </span>
    )
  }

  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        Gagal diperiksa
      </span>
    )
  }

  if (score === null || score === undefined) return null

  if (score < 20) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
        <CheckCircle className="w-3.5 h-3.5 shrink-0" />
        Orisinal ({score}%)
      </span>
    )
  }

  if (score <= 50) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        Perlu Ditinjau ({score}%)
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      Kemiripan Tinggi ({score}%)
    </span>
  )
}
