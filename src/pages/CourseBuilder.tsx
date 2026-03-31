import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { BuilderSidebar, BuilderTopBar, LessonBlockEditor } from '@/src/components/CourseBuilder'
import { useAuth } from '@/src/contexts/AuthContext'
import { BuilderProvider, useBuilder } from '@/src/contexts/BuilderContext'
import { usePageTitle } from '@/src/hooks/usePageTitle'

/**
 * CourseBuilderPage — The actual builder UI.
 * Wrapped by BuilderProvider in the exported CourseBuilder component.
 */
function CourseBuilderPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { role } = useAuth()
  const courseId = searchParams.get('courseId')
  const { state, actions } = useBuilder()

  useEffect(() => {
    // Prevent infinite loop if `actions` object changes on every render or if already loading
    if (courseId && !state.courseId && !state.loadingCourse && !state.error) {
      actions.loadCourse(courseId)
    }
  }, [courseId, state.courseId, state.loadingCourse, state.error, actions])

  if (!courseId) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-blue-600 dark:text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Materi Belum Dipilih
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Silakan pilih kelas atau materi yang ingin Anda buat dan edit melalui halaman Kelola
            Materi.
          </p>
          <button
            onClick={() =>
              navigate(role === 'admin' ? '/app/admin/courses' : '/app/teacher/courses')
            }
            className="min-h-[44px] px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-sm"
          >
            Kembali ke Kelola Materi
          </button>
        </div>
      </div>
    )
  }

  if (state.error) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Terjadi Kesalahan
          </h2>
          <p className="text-sm text-red-500 dark:text-red-400">{state.error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -mx-6 -mt-6 bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <a
        href="#builder-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg focus:shadow-lg"
      >
        Langsung ke konten
      </a>
      <header>
        <BuilderTopBar />
      </header>
      <div className="flex flex-1 min-h-0 overflow-x-auto">
        <nav aria-label="Struktur kursus">
          <BuilderSidebar />
        </nav>
        <main id="builder-main" aria-label="Editor konten">
          <LessonBlockEditor />
        </main>
      </div>
    </div>
  )
}

/**
 * CourseBuilder — Exported page component.
 * Wraps the builder in BuilderProvider context.
 */
export function CourseBuilder() {
  usePageTitle('Pembuat Kursus')
  return (
    <BuilderProvider>
      <CourseBuilderPage />
    </BuilderProvider>
  )
}
