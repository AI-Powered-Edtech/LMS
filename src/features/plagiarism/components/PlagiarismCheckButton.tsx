import { ShieldCheck } from 'lucide-react'
import { useState } from 'react'

import { useToast } from '@/hooks/useToast'

import { plagiarismService } from '../api/plagiarismService'
import type { PlagiarismStatus } from '../types'
import { PlagiarismBadge } from './PlagiarismBadge'

interface PlagiarismCheckButtonProps {
  submissionId: string
  tenantId: string
  /** Pre-loaded status from DB (if a check was already run before). */
  initialScore?: number | null
  initialStatus?: PlagiarismStatus | null
}

/**
 * Button for teachers to trigger a plagiarism check on a submission.
 * Shows a PlagiarismBadge after the check completes.
 * xAPI-style fire-and-forget — errors are shown via toast, never block the UI.
 */
export function PlagiarismCheckButton({
  submissionId,
  tenantId: _tenantId,
  initialScore = null,
  initialStatus = null,
}: PlagiarismCheckButtonProps) {
  const { addToast } = useToast()

  const [isChecking, setIsChecking] = useState(false)
  const [score, setScore] = useState<number | null>(initialScore)
  const [status, setStatus] = useState<PlagiarismStatus | null>(initialStatus)

  const hasResult = status === 'completed' || status === 'error'

  const handleCheck = async () => {
    if (isChecking) return
    setIsChecking(true)
    setStatus('processing')

    try {
      const result = await plagiarismService.checkPlagiarism(submissionId)
      setScore(result.similarity_score)
      setStatus(result.status)

      if (result.similarity_score > 50) {
        addToast({
          type: 'warning',
          message: 'Kemiripan teks tinggi terdeteksi',
          description: `Skor kemiripan: ${result.similarity_score}%. Harap tinjau submisi ini.`,
        })
      } else {
        addToast({
          type: 'success',
          message: 'Pemeriksaan plagiarisme selesai',
          description: `Skor kemiripan: ${result.similarity_score}%`,
        })
      }
    } catch (err) {
      setStatus('error')
      addToast({
        type: 'error',
        message: 'Gagal memeriksa plagiarisme',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui',
      })
    } finally {
      setIsChecking(false)
    }
  }

  if (hasResult && status) {
    return (
      <div className="flex items-center gap-2">
        <PlagiarismBadge score={score} status={status} />
        <button
          type="button"
          onClick={handleCheck}
          disabled={isChecking}
          className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 underline underline-offset-2 transition-colors disabled:cursor-not-allowed"
        >
          Periksa ulang
        </button>
      </div>
    )
  }

  if (status === 'processing' || isChecking) {
    return <PlagiarismBadge score={null} status="processing" />
  }

  // Backend currently mounts a stub handler at /api/v1/plagiarism/check that
  // returns a fake clean result. Enabling the trigger gives a false sense of
  // security ("0% kemiripan" on an unchecked submission). Disabled until the
  // real engine ships in Fase 6 (Prio 8 Unit 44 — plagiarism embedding similarity).
  // To re-enable: restore the original onClick + disabled binding once the route
  // points at plagiarism_handlers::check_plagiarism_handler.
  return (
    <button
      type="button"
      disabled
      title="Mesin plagiarisme sedang dikembangkan (Fase 6)"
      aria-label="Periksa Plagiarisme (sedang dikembangkan)"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
        bg-slate-100 text-slate-400 border border-slate-200
        dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700
        cursor-not-allowed opacity-60"
    >
      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
      Periksa Plagiarisme (segera)
    </button>
  )
}
