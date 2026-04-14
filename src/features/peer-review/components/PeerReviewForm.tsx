import { ArrowLeft, Eye, Loader2, Send, ShieldCheck } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'

import { useToast } from '@/hooks/useToast'
import { cn } from '@/utils/cn'

import { peerReviewService } from '../api/peerReviewService'
import { usePeerReviewConfig } from '../queries/peerReviewQueries'
import { useSubmitPeerReview } from '../queries/peerReviewQueries'
import type { PeerReview } from '../types'

interface PeerReviewFormProps {
  review: PeerReview
  tenantId: string
  userId: string
  onBack: () => void
}

const MIN_COMMENT_LENGTH = 50

export function PeerReviewForm({ review, tenantId, userId, onBack }: PeerReviewFormProps) {
  const addToast = useToast((s) => s.addToast)
  const submitMutation = useSubmitPeerReview()
  const { data: _peerReviewConfig } = usePeerReviewConfig(undefined, tenantId)

  const [score, setScore] = useState<string>('')
  const [comment, setComment] = useState('')
  const [submissionContent, setSubmissionContent] = useState<{
    submission_text: string | null
    file_url: string | null
  } | null>(null)
  const [loadingSubmission, setLoadingSubmission] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoadingSubmission(true)
    peerReviewService
      .getSubmissionForReview(review.submission_id, tenantId)
      .then((data) => {
        if (!cancelled) setSubmissionContent(data)
      })
      .catch(() => {
        if (!cancelled) setSubmissionContent(null)
      })
      .finally(() => {
        if (!cancelled) setLoadingSubmission(false)
      })
    return () => {
      cancelled = true
    }
  }, [review.submission_id, tenantId])

  const scoreNum = Number(score)
  const isScoreValid = score !== '' && scoreNum >= 0 && scoreNum <= 100
  const isCommentValid = comment.trim().length >= MIN_COMMENT_LENGTH
  const canSubmit = isScoreValid && isCommentValid && !submitMutation.isPending

  const handleSubmit = async () => {
    if (!canSubmit) return
    try {
      await submitMutation.mutateAsync({
        reviewId: review.id,
        score: scoreNum,
        comment: comment.trim(),
        tenantId,
        userId,
      })
      addToast({ type: 'success', message: 'Review berhasil dikirim.' })
      onBack()
    } catch {
      addToast({ type: 'error', message: 'Gagal mengirim review. Silakan coba lagi.' })
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
          aria-label="Kembali"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">Tulis Review</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            ID Tugas: <span className="font-mono">{review.submission_id.slice(0, 8)}…</span>
          </p>
        </div>
      </div>

      {/* Anonymity notice */}
      {review && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Identitas Anda dirahasiakan dari penerima review.
          </p>
        </div>
      )}

      {/* Submission content */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Konten Tugas (Hanya Baca)
          </span>
        </div>
        {loadingSubmission ? (
          <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
        ) : submissionContent?.submission_text ? (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl max-h-48 overflow-y-auto">
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
              {submissionContent.submission_text}
            </p>
          </div>
        ) : submissionContent?.file_url ? (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl">
            <p className="text-sm text-slate-500 dark:text-slate-400 italic">
              Tugas berupa file terlampir.
            </p>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl">
            <p className="text-sm text-slate-400 dark:text-slate-500 italic">
              Konten tugas tidak tersedia untuk ditampilkan.
            </p>
          </div>
        )}
      </div>

      {/* Score input */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
          Nilai (0–100)
        </label>
        <input
          type="number"
          min={0}
          max={100}
          value={score}
          onChange={(e) => setScore(e.target.value)}
          placeholder="Contoh: 85"
          className={cn(
            'w-full px-3 py-2.5 bg-white dark:bg-slate-800 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm transition-colors',
            score && !isScoreValid
              ? 'border-red-400 dark:border-red-500'
              : 'border-slate-200 dark:border-slate-700'
          )}
        />
        {score && !isScoreValid && (
          <p className="text-xs text-red-500">Nilai harus antara 0 dan 100.</p>
        )}
      </div>

      {/* Comment textarea */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
          Komentar Review
          <span className="ml-1 text-slate-400 font-normal">
            (min. {MIN_COMMENT_LENGTH} karakter)
          </span>
        </label>
        <textarea
          rows={5}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Berikan komentar yang konstruktif dan spesifik tentang tugas ini..."
          className={cn(
            'w-full px-3 py-2.5 bg-white dark:bg-slate-800 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm resize-none transition-colors',
            comment && !isCommentValid
              ? 'border-red-400 dark:border-red-500'
              : 'border-slate-200 dark:border-slate-700'
          )}
        />
        <div className="flex items-center justify-between">
          {comment && !isCommentValid ? (
            <p className="text-xs text-red-500">
              Komentar kurang dari {MIN_COMMENT_LENGTH} karakter (saat ini {comment.trim().length}).
            </p>
          ) : (
            <span />
          )}
          <span
            className={cn(
              'text-xs',
              comment.trim().length >= MIN_COMMENT_LENGTH
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-400'
            )}
          >
            {comment.trim().length}/{MIN_COMMENT_LENGTH}+
          </span>
        </div>
      </div>

      {/* Submit button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitMutation.isPending ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Send className="w-5 h-5" />
        )}
        Kirim Review
      </button>
    </motion.div>
  )
}
