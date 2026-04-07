import { AlertTriangle, Award, Calendar, CheckCircle, Loader2, Send } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import {
  assignmentService,
  AssignmentSubmission,
} from '@/features/assignments/api/assignmentService'
import { cn } from '@/utils/cn'

interface AssignmentViewerProps {
  assignmentId: string
  title: string
  instructions: string | null
  maxPoints: number
  maxAttempts: number
  isPublished: boolean
  dueDate: string | null
  isCompleted: boolean
  onCompletionMet: () => void
  onStartViewing: () => void
}

export function AssignmentViewer({
  assignmentId,
  title,
  instructions,
  maxPoints,
  maxAttempts,
  isPublished,
  dueDate,
  isCompleted,
  onCompletionMet,
  onStartViewing,
}: AssignmentViewerProps) {
  const { user, tenantId, role } = useAuth()
  const [submissionText, setSubmissionText] = useState('')
  const [submission, setSubmission] = useState<AssignmentSubmission | null>(null)
  const [attemptCount, setAttemptCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const onStartViewingRef = useRef(onStartViewing)
  onStartViewingRef.current = onStartViewing

  useEffect(() => {
    onStartViewingRef.current()
    if (!user?.id || !tenantId) return

    async function loadSubmission() {
      try {
        const data = await assignmentService.getAssignmentDetails(assignmentId, user!.id, tenantId!)
        if (data && data.assignment_submissions?.length > 0) {
          const sub = data.assignment_submissions[0]
          setSubmission(sub)
          setSubmissionText(sub.submission_content?.content || '')
          setAttemptCount(1) // No attempt_number in new schema
        }
      } catch (err: unknown) {
        if (import.meta.env.DEV) console.error('Error loading submission:', err)
        setError(err instanceof Error ? err.message : 'Gagal memuat submisi tugas.')
      } finally {
        setIsLoading(false)
      }
    }
    void loadSubmission()
  }, [assignmentId, user?.id, tenantId])

  const handleSubmit = async () => {
    if (!user?.id || !submissionText.trim()) return
    setIsSubmitting(true)
    setError(null)
    try {
      const submissionContent = { type: 'text', content: submissionText, file_urls: [] }
      const result = await assignmentService.submitAssignment(
        assignmentId,
        user.id,
        tenantId!,
        submissionContent
      )
      setSubmission(result)
      setAttemptCount(attemptCount + 1)
      onCompletionMet()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Kesalahan tidak diketahui')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mr-3" />
        <span className="font-medium">Memuat tugas...</span>
      </div>
    )
  }

  const isSubmitted = !!submission
  const isGraded = false // Grades are separate in new schema
  const canEdit = !isSubmitted && !isGraded && !isCompleted

  // Handle unpublished assignments for students
  if (!isPublished && role === 'student') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-slate-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-800">Tugas Belum Tersedia</h3>
          <p className="text-slate-500 max-w-xs mt-1">
            Tugas ini masih dalam status draf dan belum dipublikasikan oleh guru Anda.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto bg-slate-50/30">
      <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-8">
        {/* Status Bar */}
        <AnimatePresence>
          {(isSubmitted || isGraded) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'flex items-center gap-3 p-4 rounded-2xl border shadow-sm',
                isGraded
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                  : 'bg-blue-50 border-blue-100 text-blue-800'
              )}
            >
              {isGraded ? <Award className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
              <div className="flex-1">
                <p className="font-bold text-sm">
                  {isGraded ? 'Tugas Telah Dinilai' : 'Tugas Telah Dikirim'}
                </p>
                <p className="text-xs opacity-80">Guru akan segera memeriksa pekerjaan Anda.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Assignment Info */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">{title}</h2>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <Award className="w-3.5 h-3.5" />
                    {maxPoints} Poin Maksimum
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider border-l border-slate-200 pl-4">
                    {maxAttempts} Maks. Percobaan
                  </div>
                  {dueDate && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-500 uppercase tracking-wider">
                      <Calendar className="w-3.5 h-3.5" />
                      Tenggat:{' '}
                      {new Date(dueDate).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100 w-full" />

            <div className="prose prose-slate max-w-none">
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-3">
                Instruksi
              </h4>
              <div className="text-slate-600 whitespace-pre-wrap leading-relaxed">
                {instructions || 'Tidak ada instruksi khusus.'}
              </div>
            </div>
          </div>
        </div>

        {/* Submission Area */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest px-1">
            Pekerjaan Anda
          </h4>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 transition-all">
            <textarea
              value={submissionText}
              onChange={(e) => setSubmissionText(e.target.value)}
              disabled={!canEdit}
              placeholder="Tuliskan jawaban atau laporan tugas Anda di sini..."
              className="w-full h-64 p-8 resize-none outline-none text-slate-700 leading-relaxed disabled:bg-slate-50/50 disabled:text-slate-500"
            />

            {!isGraded && (
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-400 font-medium">
                  {isSubmitted
                    ? 'Anda dapat membatalkan pengiriman untuk mengedit.'
                    : 'Pastikan jawaban Anda sudah lengkap sebelum mengirim.'}
                </p>

                {isSubmitted ? (
                  showCancelConfirm ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Yakin batalkan?</span>
                      <button
                        // NOTE: Cancel submission belum didukung backend. Lihat docs/prd/PRD_assignments.md untuk roadmap.
                        onClick={() => {
                          setSubmission(null)
                          setShowCancelConfirm(false)
                        }}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 transition-colors"
                      >
                        Ya
                      </button>
                      <button
                        onClick={() => setShowCancelConfirm(false)}
                        className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      className="text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors"
                    >
                      Batalkan Pengiriman
                    </button>
                  )
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !submissionText.trim()}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 transition-all transform active:scale-95"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Kirim Tugas
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-sm rounded-2xl flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
