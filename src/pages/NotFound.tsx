import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export function NotFound() {
  const navigate = useNavigate()

  useEffect(() => {
    document.title = '404 — EduSync'
    return () => {
      document.title = 'EduSync'
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <div className="text-center max-w-md">
        {/* Large 404 */}
        <h1 className="text-8xl sm:text-9xl font-black text-slate-200 dark:text-slate-700 leading-none select-none">
          404
        </h1>

        {/* Title */}
        <h2 className="mt-4 text-2xl font-extrabold text-slate-800 dark:text-slate-100">
          Halaman tidak ditemukan
        </h2>

        {/* Subtext */}
        <p className="mt-3 text-slate-500 dark:text-slate-400 text-base leading-relaxed">
          Halaman yang Anda cari tidak ada atau telah dipindahkan.
        </p>

        {/* CTA */}
        <button
          onClick={() => navigate('/app')}
          className="mt-8 inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-md shadow-blue-200 dark:shadow-blue-900/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Kembali ke Dashboard
        </button>
      </div>
    </div>
  )
}
