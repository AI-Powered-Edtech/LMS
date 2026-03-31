import { AlertTriangle, CheckCircle, Flag, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import React, { useState } from 'react'

import {
  ContentType,
  ReportReason,
  useSubmitReport,
} from '@/features/moderation/queries/moderationQueries'

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  contentId: string
  contentType: ContentType
  contentSnippet?: string
  contentAuthor?: string
}

export function ReportModal({
  isOpen,
  onClose,
  contentId,
  contentType,
  contentSnippet,
  contentAuthor,
}: ReportModalProps) {
  const submitReport = useSubmitReport()
  const [reason, setReason] = useState<ReportReason>('inappropriate')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate network delay
    setTimeout(() => {
      submitReport.mutate({
        contentId,
        contentType,
        reason,
        description,
        contentSnippet,
        contentAuthor,
      })
      setIsSubmitting(false)
      setIsSuccess(true)

      setTimeout(() => {
        setIsSuccess(false)
        onClose()
        setDescription('')
        setReason('inappropriate')
      }, 2000)
    }, 1000)
  }

  const reasons: { value: ReportReason; label: string; desc: string }[] = [
    {
      value: 'ai_generated',
      label: 'Konten AI',
      desc: 'Konten terlihat dibuat oleh AI tanpa atribusi atau tidak relevan.',
    },
    {
      value: 'inappropriate',
      label: 'Tidak Pantas',
      desc: 'Mengandung kata-kata kasar, SARA, atau konten dewasa.',
    },
    {
      value: 'spam',
      label: 'Spam / Iklan',
      desc: 'Promosi produk atau layanan yang tidak relevan.',
    },
    {
      value: 'harassment',
      label: 'Pelecehan',
      desc: 'Menyerang atau merendahkan individu atau kelompok.',
    },
    { value: 'other', label: 'Lainnya', desc: 'Alasan lain yang tidak tercantum di atas.' },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
          >
            {isSuccess ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Laporan Terkirim</h3>
                <p className="text-slate-500">
                  Terima kasih telah membantu menjaga komunitas kami tetap aman.
                </p>
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Flag className="w-4 h-4 text-red-500" />
                    Laporkan Konten
                  </h3>
                  <button
                    onClick={onClose}
                    className="p-1 hover:bg-slate-200 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm text-slate-600">
                    <p className="font-medium mb-1 text-slate-900">Konten yang dilaporkan:</p>
                    <p className="italic line-clamp-2">
                      "{contentSnippet || 'Konten tidak tersedia'}"
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-sm font-bold text-slate-700">
                      Alasan Pelaporan
                    </label>
                    <div className="grid gap-2">
                      {reasons.map((r) => (
                        <label
                          key={r.value}
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            reason === r.value
                              ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-500'
                              : 'bg-white border-slate-200 hover:border-blue-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="reason"
                            value={r.value}
                            checked={reason === r.value}
                            onChange={(e) => setReason(e.target.value as ReportReason)}
                            className="mt-1 w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                          />
                          <div>
                            <span className="block text-sm font-bold text-slate-900">
                              {r.label}
                            </span>
                            <span className="block text-xs text-slate-500 mt-0.5">{r.desc}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">
                      Deskripsi Tambahan (Opsional)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Jelaskan lebih lanjut mengapa konten ini bermasalah..."
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                    />
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4" />
                          Kirim Laporan
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
