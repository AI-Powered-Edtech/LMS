import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { BuilderSidebar, BuilderTopBar, LessonBlockEditor } from '@/components/CourseBuilder'
import { useAuth } from '@/contexts/AuthContext'
import { BuilderProvider, useBuilder } from '@/contexts/BuilderContext'
import { CourseBuilderAICopilotDrawer } from '@/features/ai-builder-copilot/components/CourseBuilderAICopilotDrawer'
import { useAICopilotFeatureGate } from '@/features/ai-builder-copilot/hooks/useAICopilotFeatureGate'
import { useBuilderAICopilotStore } from '@/features/ai-builder-copilot/store/builderAICopilot.store'
import { CourseReleasePanel } from '@/features/courses/components/CourseReleasePanel'
import { usePageTitle } from '@/hooks/usePageTitle'

/**
 * CourseBuilderPage — The actual builder UI.
 * Wrapped by BuilderProvider in the exported CourseBuilder component.
 */
function CourseBuilderPage() {
  // P1 fix: set title di awal agar tidak flicker dari halaman sebelumnya
  usePageTitle('Pembuat Kursus')
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { activeRole } = useAuth()
  const courseId = searchParams.get('courseId')
  const { state, actions } = useBuilder()
  const { enabled: copilotEnabled } = useAICopilotFeatureGate()
  const copilotIsOpen = useBuilderAICopilotStore((s) => s.isOpen)
  const openCopilotDrawer = useBuilderAICopilotStore((s) => s.openDrawer)
  const closeCopilotDrawer = useBuilderAICopilotStore((s) => s.closeDrawer)
  const [activePanel, setActivePanel] = useState<'none' | 'release' | 'copilot'>('none')

  const releasePanelOpen = activePanel === 'release'
  const drawerOpen = activePanel === 'copilot'

  const toggleReleasePanel = () =>
    setActivePanel((prev) => (prev === 'release' ? 'none' : 'release'))

  const toggleCopilot = () => {
    if (activePanel === 'copilot') {
      setActivePanel('none')
      closeCopilotDrawer()
      return
    }

    setActivePanel('copilot')
    openCopilotDrawer()
  }

  // Auto-load course from URL param
  useEffect(() => {
    if (courseId && !state.courseId && !state.loadingCourse && !state.error) {
      void actions.loadCourse(courseId)
    }
  }, [courseId, state.courseId, state.loadingCourse, state.error, actions])

  useEffect(() => {
    if (copilotIsOpen && activePanel !== 'copilot') {
      setActivePanel('copilot')
    }

    if (!copilotIsOpen && activePanel === 'copilot') {
      setActivePanel('none')
    }
  }, [activePanel, copilotIsOpen])

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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Pembuat Kursus
          </h1>
          <p className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">
            Belum ada materi yang dipilih
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Silakan pilih kelas atau materi yang ingin Anda buat dan edit melalui halaman Kelola
            Materi.
          </p>
          <button
            data-testid="coursebuilder-back-button"
            onClick={() =>
              navigate(activeRole === 'admin' ? '/app/admin/courses' : '/app/teacher/courses')
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
    console.error('BUILDER ERROR:', state.error);
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
        data-testid="coursebuilder-skip-link"
        href="#builder-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg focus:shadow-lg"
      >
        Langsung ke konten
      </a>
      <header>
        <BuilderTopBar
          data-testid="coursebuilder-topbar"
          releasePanelOpen={releasePanelOpen}
          onToggleReleasePanel={toggleReleasePanel}
          copilotOpen={drawerOpen}
          onToggleCopilot={copilotEnabled ? toggleCopilot : undefined}
        />
      </header>
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <nav aria-label="Struktur kursus">
          <BuilderSidebar data-testid="coursebuilder-sidebar" />
        </nav>
        <main
          id="builder-main"
          aria-label="Editor konten"
          data-testid="coursebuilder-editor"
          className="flex-1 min-w-0 overflow-auto"
        >
          <LessonBlockEditor />
        </main>
        {drawerOpen && (
          <CourseBuilderAICopilotDrawer
            onClose={() => {
              setActivePanel('none')
              closeCopilotDrawer()
            }}
          />
        )}
        {releasePanelOpen && (
          <CourseReleasePanel
            data-testid="coursebuilder-release-panel"
            onClose={() => setActivePanel('none')}
          />
        )}
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
