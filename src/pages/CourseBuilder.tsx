import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { BuilderSidebar, BuilderTopBar, LessonBlockEditor } from '@/components/CourseBuilder'
import { useAuth } from '@/contexts/AuthContext'
import { BuilderProvider, useBuilder } from '@/contexts/BuilderContext'
import { MobileCourseBuilderNav } from '@/features/courses/components/MobileCourseBuilderNav'
import { usePageTitle } from '@/hooks/usePageTitle'
import { cn } from '@/utils/cn'

/**
 * CourseBuilderPage — The actual builder UI.
 * Wrapped by BuilderProvider in the exported CourseBuilder component.
 */
function CourseBuilderPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { role } = useAuth()
  const courseId = searchParams.get('courseId')
  const { state, actions, mobile } = useBuilder()
  // Mobile tab state: 'struktur' = BuilderSidebar, 'editor' = LessonBlockEditor
  const [mobileTab, setMobileTab] = useState<'struktur' | 'editor'>('struktur')

  useEffect(() => {
    // Prevent infinite loop if `actions` object changes on every render or if already loading
    if (courseId && !state.courseId && !state.loadingCourse && !state.error) {
      actions.loadCourse(courseId)
    }
  }, [courseId, state.courseId, state.loadingCourse, state.error, actions])

  // Di mobile: saat lesson baru dipilih, otomatis pindah ke tab editor
  useEffect(() => {
    if (mobile.isMobile && state.activeLesson?.id) {
      setMobileTab('editor')
    }
  }, [mobile.isMobile, state.activeLesson?.id])

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

  // Saat lesson dipilih dari sidebar di mobile, otomatis pindah ke tab editor
  const handleMobileTabChange = (tab: 'struktur' | 'editor') => {
    setMobileTab(tab)
    // Jika pindah ke editor dan sidebar terbuka, tutup sidebar
    if (tab === 'editor' && mobile.sidebarOpen) {
      mobile.closeSidebar()
    }
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

      {/* Desktop layout (md+): sidebar + editor side by side */}
      <div className="hidden md:flex flex-1 min-h-0 overflow-x-auto">
        <nav aria-label="Struktur kursus" className="shrink-0 flex flex-col h-full">
          <BuilderSidebar inlineMode />
        </nav>
        <main
          id="builder-main"
          aria-label="Editor konten"
          className="flex-1 min-h-0 overflow-hidden flex flex-col"
        >
          <LessonBlockEditor />
        </main>
      </div>

      {/* Mobile layout (< md): tab-based full screen */}
      <div className="flex md:hidden flex-1 min-h-0 flex-col overflow-hidden">
        {/* Mobile Tab Switcher */}
        <div className="flex shrink-0 px-4 pt-3 pb-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 gap-2">
          <button
            type="button"
            onClick={() => handleMobileTabChange('struktur')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all min-h-[44px]',
              mobileTab === 'struktur'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            )}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            Struktur Kursus
          </button>
          <button
            type="button"
            onClick={() => handleMobileTabChange('editor')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all min-h-[44px]',
              mobileTab === 'editor'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            )}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Edit Konten
          </button>
        </div>

        {/* Tab Panels */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <div
            className={cn(
              'flex-1 min-h-0 overflow-hidden',
              mobileTab === 'struktur' ? 'flex flex-col' : 'hidden'
            )}
          >
            <nav
              aria-label="Struktur kursus"
              className="flex-1 min-h-0 overflow-y-auto flex flex-col"
            >
              <BuilderSidebar inlineMode />
            </nav>
          </div>
          <div
            className={cn(
              'flex-1 min-h-0 overflow-hidden',
              mobileTab === 'editor' ? 'flex flex-col' : 'hidden'
            )}
          >
            <main
              id="builder-main"
              aria-label="Editor konten"
              className="flex-1 min-h-0 overflow-hidden flex flex-col"
            >
              <LessonBlockEditor />
            </main>
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <MobileCourseBuilderNav activeTab={mobileTab} onTabChange={handleMobileTabChange} />
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
