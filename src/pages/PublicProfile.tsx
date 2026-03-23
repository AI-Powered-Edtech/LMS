import { ChevronLeft, Users } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

import { usePageTitle } from '@/src/hooks/usePageTitle'

/**
 * PublicProfile — placeholder page.
 *
 * The feature requires a `username` column on `profiles` plus additional
 * tables for followers, interests, reputation, etc.  Until that schema
 * work is complete this page renders an honest "coming soon" state instead
 * of fabricated mock data.
 */
export function PublicProfile() {
  usePageTitle('Profil Publik')
  const { username } = useParams()
  const navigate = useNavigate()

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 pb-24 md:pb-8">
      {/* Back Navigation */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors font-medium text-sm"
      >
        <ChevronLeft className="w-4 h-4" /> Kembali
      </button>

      {/* Coming Soon Placeholder */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* Cover gradient */}
        <div className="h-32 md:h-48 w-full bg-gradient-to-r from-blue-500 to-indigo-600" />

        <div className="px-6 md:px-8 pb-8">
          <div className="flex flex-col items-center -mt-12 md:-mt-16 text-center">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white dark:bg-slate-800 p-1.5 shadow-lg mb-4">
              <div className="w-full h-full rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <Users className="w-12 h-12 md:w-16 md:h-16 text-slate-400 dark:text-slate-500" />
              </div>
            </div>

            {username && (
              <p className="text-lg font-medium text-slate-500 dark:text-slate-400 mb-6">
                @{username}
              </p>
            )}

            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm font-medium text-amber-700 dark:text-amber-300 mb-4">
              Fitur profil publik sedang dalam pengembangan
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
              Halaman ini akan menampilkan profil pengguna, pencapaian, lencana, dan aktivitas
              terbaru setelah fitur profil publik diluncurkan.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
