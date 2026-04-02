import { ArrowLeft, BookOpen, CheckCircle, Home, RefreshCw, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { usePageTitle } from '@/hooks/usePageTitle'

const OFFLINE_TIPS = [
  { icon: CheckCircle, text: 'Quiz yang sudah dimulai tersimpan otomatis' },
  { icon: CheckCircle, text: 'Lesson video yang sudah dimuat dapat ditonton offline' },
  { icon: CheckCircle, text: 'Tugas dapat ditulis offline dan disinkronkan saat online' },
  { icon: CheckCircle, text: 'Halaman yang pernah dibuka tersimpan di cache browser' },
]

export function Offline() {
  usePageTitle('Offline')
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const navigate = useNavigate()

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Auto-reload when connection is restored
  useEffect(() => {
    if (isOnline) {
      const timer = setTimeout(() => {
        window.location.reload()
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [isOnline])

  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 dark:bg-slate-900">
      <div className="mx-auto w-full max-w-md text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <WifiOff className="h-12 w-12 text-slate-400 dark:text-slate-600" aria-hidden="true" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Anda Sedang Offline</h1>
        <p className="mt-3 text-slate-500 dark:text-slate-400">
          Halaman ini membutuhkan koneksi internet. Silakan periksa koneksi Anda dan coba lagi.
        </p>

        {/* Connection Status Indicator */}
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 dark:bg-slate-800">
          <div
            className={`h-3 w-3 rounded-full transition-colors ${
              isOnline ? 'animate-pulse bg-green-500' : 'bg-red-500'
            }`}
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {isOnline ? 'Koneksi dipulihkan — memuat ulang…' : 'Tidak ada koneksi internet'}
          </span>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={handleRetry}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 font-bold text-white transition-colors hover:bg-blue-700 active:bg-blue-800"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Coba Lagi
          </button>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-2.5 font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Kembali
          </button>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 font-bold text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Beranda
          </Link>
        </div>

        {/* Cached content tips */}
        <div className="mt-10 rounded-2xl border border-blue-100 bg-blue-50 p-5 text-left dark:border-blue-800 dark:bg-blue-900/20">
          <div className="mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <h3 className="font-bold text-blue-900 dark:text-blue-100">Konten Tersedia Offline</h3>
          </div>
          <ul className="space-y-2">
            {OFFLINE_TIPS.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="flex items-start gap-2 text-sm text-blue-700 dark:text-blue-300"
              >
                <Icon
                  className="mt-0.5 h-4 w-4 shrink-0 text-blue-500 dark:text-blue-400"
                  aria-hidden="true"
                />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Screen reader accessibility */}
      <p className="sr-only" aria-live="polite">
        {isOnline
          ? 'Koneksi telah dipulihkan. Halaman akan dimuat ulang secara otomatis.'
          : 'Anda sedang offline. Koneksi internet Anda saat ini tidak aktif.'}
      </p>
    </div>
  )
}
