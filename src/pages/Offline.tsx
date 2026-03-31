import { useEffect, useState } from 'react'
import { WifiOff, RefreshCw, Home, ArrowLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { usePageTitle } from '@/src/hooks/usePageTitle'

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

  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.reload()
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 dark:bg-slate-900">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <WifiOff className="h-12 w-12 text-slate-400 dark:text-slate-600" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Anda Sedang Offline</h1>
        <p className="mt-3 text-slate-500 dark:text-slate-400">
          Halaman ini membutuhkan koneksi internet. Silakan periksa koneksi Anda dan coba lagi.
        </p>

        {/* Connection Status Indicator */}
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 dark:bg-slate-800">
          <div
            className={`h-3 w-3 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}
            aria-label={isOnline ? 'Online' : 'Offline'}
          />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {isOnline ? 'Koneksi dipulihkan' : 'Tidak ada koneksi'}
          </span>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={handleRetry}
            disabled={!isOnline}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-xl transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isOnline ? 'animate-spin' : 'opacity-50'}`} />
            Coba Lagi
          </button>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </button>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-slate-500 dark:text-slate-400 font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Home className="h-4 w-4" />
            Beranda
          </Link>
        </div>

        {/* Tips for offline use */}
        <div className="mt-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 p-4 text-left border border-blue-100 dark:border-blue-800">
          <h3 className="font-bold text-blue-900 dark:text-blue-100">Tips Menggunakan Offline</h3>
          <ul className="mt-2 text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Quiz yang sudah dimulai akan tersimpan otomatis</li>
            <li>• Lesson video yang sudah dimuat dapat ditonton offline</li>
            <li>• Tugas dapat ditulis offline dan disinkronkan saat online</li>
          </ul>
        </div>

        {/* Screen reader accessibility */}
        <p className="sr-only">
          Anda sedang offline. Koneksi internet Anda saat ini tidak aktif.
          {isOnline &&
            ' Koneksi telah dipulihkan. Klik tombol Coba Lagi untuk memuat ulang halaman.'}
        </p>
      </div>
    </div>
  )
}
