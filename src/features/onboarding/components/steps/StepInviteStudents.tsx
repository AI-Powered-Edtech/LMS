import { Check, Copy, GraduationCap } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui'

interface StepInviteStudentsProps {
  onNext: () => void
  joinCode: string | null
}

/**
 * Step 3 — Undang Siswa ke Kelas: tampilkan kode bergabung dan cara share.
 */
export function StepInviteStudents({ onNext, joinCode }: StepInviteStudentsProps) {
  const [copied, setCopied] = useState(false)

  const displayCode = joinCode || '------'
  const joinUrl = `${window.location.origin}/#/join?code=${displayCode}`
  const qrUrl = `https://chart.googleapis.com/chart?cht=qr&chs=150x150&chl=${encodeURIComponent(joinUrl)}&choe=UTF-8`

  function copyCode() {
    navigator.clipboard.writeText(displayCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function copyLink() {
    navigator.clipboard.writeText(joinUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="py-2">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center">
          <GraduationCap className="w-6 h-6 text-emerald-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Undang Siswa ke Kelas
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Bagikan kode ini ke siswa Anda
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 border border-indigo-100 dark:border-indigo-800/40 rounded-2xl p-5 mb-4 text-center">
        <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">
          Kode Bergabung
        </p>
        <p className="text-4xl font-black tracking-[0.3em] text-indigo-700 dark:text-indigo-300 mb-1">
          {displayCode}
        </p>
        {joinCode && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Berlaku hingga kelas dihapus
          </p>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={copyCode}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          Salin Kode
        </button>
        <button
          onClick={copyLink}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <Copy className="w-4 h-4" />
          Salin Link
        </button>
      </div>

      {joinCode && (
        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 mb-4">
          <img
            src={qrUrl}
            alt="QR Code bergabung kelas"
            className="w-16 h-16 rounded-lg"
            loading="lazy"
            decoding="async"
          />
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">QR Code</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Tampilkan di papan tulis agar siswa bisa scan langsung
            </p>
          </div>
        </div>
      )}

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40 rounded-xl p-3 mb-6">
        <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
          💡 <span className="font-semibold">Tips:</span> Bagikan kode ini ke siswa via WhatsApp
          atau tulis di papan tulis. Siswa cukup buka EduSync dan masukkan kode ini.
        </p>
      </div>

      <Button
        size="md"
        fullWidth
        onClick={onNext}
        className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-0"
      >
        Selesai, Lanjut <Check className="w-4 h-4" />
      </Button>
    </div>
  )
}
