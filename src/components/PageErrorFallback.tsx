import { AlertTriangle, RefreshCcw } from 'lucide-react'

interface PageErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

/**
 * PageErrorFallback — ditampilkan ketika ada error di dalam lazy-loaded component.
 * Digunakan sebagai fallback untuk react-error-boundary pada level route.
 */
export function PageErrorFallback({ error, resetErrorBoundary }: PageErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-3xl flex items-center justify-center mb-6 text-red-500 dark:text-red-400 border border-red-200 dark:border-red-800">
        <AlertTriangle className="w-10 h-10" />
      </div>

      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
        Terjadi Kesalahan
      </h2>

      <p className="text-slate-500 dark:text-slate-400 mb-2 max-w-md">
        Halaman ini tidak dapat dimuat. Ini mungkin masalah sementara — coba muat ulang halaman.
      </p>

      {/* Tampilkan pesan error hanya di mode development */}
      {import.meta.env.DEV && error?.message && (
        <pre className="mt-3 mb-4 max-w-lg text-left text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-xl p-3 overflow-auto whitespace-pre-wrap break-words">
          {error.message}
        </pre>
      )}

      <div className="flex gap-3 mt-4">
        <button
          onClick={resetErrorBoundary}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
        >
          <RefreshCcw className="w-4 h-4" />
          Coba Lagi
        </button>

        <button
          onClick={() => (window.location.href = '/#/app')}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
        >
          Ke Beranda
        </button>
      </div>
    </div>
  )
}
