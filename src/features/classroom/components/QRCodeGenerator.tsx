import { Check, Copy, Download, Link as LinkIcon, QrCode, X } from 'lucide-react'
import { useState } from 'react'

interface QRCodeGeneratorProps {
  joinCode: string
  className?: string
  onClose?: () => void
}

/**
 * QRCodeGenerator — generates a scannable QR code for class join links.
 *
 * Uses Google Charts API to render QR code as an image (no extra library needed).
 * URL format: {origin}/join?code={joinCode}
 *
 * Features:
 * - Download as PNG
 * - Copy join link
 * - Print-friendly (white background, high contrast)
 */
export function QRCodeGenerator({ joinCode, className = '', onClose }: QRCodeGeneratorProps) {
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)

  const joinUrl = `${window.location.origin}/join?code=${encodeURIComponent(joinCode)}`
  const qrApiUrl = `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chld=M|1&chl=${encodeURIComponent(joinUrl)}`

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      // fallback
      const el = document.createElement('textarea')
      el.value = joinUrl
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(joinCode)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    } catch {
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    }
  }

  const handleDownload = async () => {
    try {
      // Fetch the QR image and download as PNG
      const response = await fetch(qrApiUrl)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `kode-kelas-${joinCode}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      // fallback: open in new tab
      window.open(qrApiUrl, '_blank')
    }
  }

  return (
    <div
      className={`bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-xl overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-700">
        <div className="flex items-center gap-2">
          <QrCode className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
            QR Code Kelas
          </h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
            aria-label="Tutup QR code"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* QR Code area — always white bg for scanability */}
      <div className="flex flex-col items-center px-6 pt-6 pb-4">
        <div className="bg-white rounded-xl p-3 shadow-sm border border-neutral-100 inline-block">
          <img
            src={qrApiUrl}
            alt={`QR Code untuk kelas dengan kode ${joinCode}`}
            width={200}
            height={200}
            className="block"
            loading="lazy"
          />
        </div>

        {/* Join code label */}
        <div className="mt-4 text-center">
          <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1">
            Kode Gabung
          </p>
          <span className="text-3xl font-black tracking-[0.3em] text-neutral-900 dark:text-neutral-100 font-mono">
            {joinCode}
          </span>
        </div>

        {/* Instructions */}
        <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center mt-3 max-w-[220px] leading-relaxed">
          Scan QR code atau bagikan link untuk siswa bergabung ke kelas ini
        </p>
      </div>

      {/* Actions */}
      <div className="px-5 pb-5 flex flex-col gap-2">
        <div className="flex gap-2">
          <button
            onClick={handleCopyLink}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-semibold text-xs rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
          >
            {copiedLink ? (
              <Check className="w-3.5 h-3.5 text-success-500" />
            ) : (
              <LinkIcon className="w-3.5 h-3.5" />
            )}
            {copiedLink ? 'Link Tersalin!' : 'Salin Link'}
          </button>
          <button
            onClick={handleCopyCode}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold text-xs rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
          >
            {copiedCode ? (
              <Check className="w-3.5 h-3.5 text-success-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copiedCode ? 'Kode Tersalin!' : 'Salin Kode'}
          </button>
        </div>
        <button
          onClick={handleDownload}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-semibold text-xs rounded-xl hover:bg-neutral-700 dark:hover:bg-white transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Unduh QR Code (PNG)
        </button>
      </div>
    </div>
  )
}
